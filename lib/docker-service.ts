import Docker from 'dockerode';
import { R2Service } from './r2-service';
import { AppError } from './error-handler';

const docker = new Docker();

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  ports: { [key: string]: number };
  created: Date;
}

export interface ContainerConfig {
  playgroundId: string;
  template: string;
  language: string;
  ports?: number[];
}

export class DockerService {
  private static instance: DockerService;
  private containers = new Map<string, Docker.Container>();

  public static getInstance(): DockerService {
    if (!DockerService.instance) {
      DockerService.instance = new DockerService();
    }
    return DockerService.instance;
  }

  async createContainer(config: ContainerConfig): Promise<ContainerInfo> {
    try {
      const containerName = `playground-${config.playgroundId}`;
      
      // Check if container already exists
      const existingContainer = await this.getContainer(config.playgroundId);
      if (existingContainer) {
        throw new AppError('Container already exists', 409, 'CONTAINER_EXISTS');
      }

      // Get base image for the template
      const baseImage = this.getBaseImage(config.template);
      
      // Ensure image is available
      await this.pullImageIfNeeded(baseImage);

      // Create init script for downloading template
      const initScript = await this.createInitScript(config.template);

      // Create container with volume and networking
      const container = await docker.createContainer({
        Image: baseImage,
        name: containerName,
        Cmd: ['/bin/bash', '-c', initScript],
        WorkingDir: '/workspace',
        Env: [
          `TEMPLATE=${config.template}`,
          `LANGUAGE=${config.language}`,
          'DEBIAN_FRONTEND=noninteractive'
        ],
        ExposedPorts: {
          '3000/tcp': {},
          '5000/tcp': {},
          '8000/tcp': {},
          '8080/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '3000/tcp': [{ HostPort: '0' }], // Random port
            '5000/tcp': [{ HostPort: '0' }],
            '8000/tcp': [{ HostPort: '0' }],
            '8080/tcp': [{ HostPort: '0' }]
          },
          Memory: 1024 * 1024 * 1024, // 1GB
          CpuShares: 512,
          NetworkMode: 'bridge'
        },
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false
      });

      // Start the container
      await container.start();

      // Store container reference
      this.containers.set(config.playgroundId, container);

      // Get container info
      const containerInfo = await this.getContainerInfo(container);
      
      console.log(`Container created: ${containerName}`, containerInfo);
      
      return containerInfo;
    } catch (error) {
      console.error('Error creating container:', error);
      throw new AppError('Failed to create container', 500, 'CONTAINER_CREATE_ERROR');
    }
  }

  async getContainer(playgroundId: string): Promise<ContainerInfo | null> {
    try {
      const containerName = `playground-${playgroundId}`;
      const containers = await docker.listContainers({ all: true });
      
      const containerData = containers.find(c => 
        c.Names.some(name => name === `/${containerName}`)
      );

      if (!containerData) {
        return null;
      }

      const container = docker.getContainer(containerData.Id);
      return await this.getContainerInfo(container);
    } catch (error) {
      console.error('Error getting container:', error);
      return null;
    }
  }

  async startContainer(playgroundId: string): Promise<ContainerInfo> {
    try {
      const containerName = `playground-${playgroundId}`;
      let container = this.containers.get(playgroundId);

      if (!container) {
        // Try to find existing container
        const containers = await docker.listContainers({ all: true });
        const containerData = containers.find(c => 
          c.Names.some(name => name === `/${containerName}`)
        );

        if (containerData) {
          container = docker.getContainer(containerData.Id);
          this.containers.set(playgroundId, container);
        } else {
          throw new AppError('Container not found', 404, 'CONTAINER_NOT_FOUND');
        }
      }

      const inspect = await container.inspect();
      if (!inspect.State.Running) {
        await container.start();
      }

      return await this.getContainerInfo(container);
    } catch (error) {
      console.error('Error starting container:', error);
      throw new AppError('Failed to start container', 500, 'CONTAINER_START_ERROR');
    }
  }

  async stopContainer(playgroundId: string): Promise<void> {
    try {
      const container = this.containers.get(playgroundId);
      if (!container) {
        throw new AppError('Container not found', 404, 'CONTAINER_NOT_FOUND');
      }

      await container.stop();
      console.log(`Container stopped: playground-${playgroundId}`);
    } catch (error) {
      console.error('Error stopping container:', error);
      throw new AppError('Failed to stop container', 500, 'CONTAINER_STOP_ERROR');
    }
  }

  async removeContainer(playgroundId: string): Promise<void> {
    try {
      const container = this.containers.get(playgroundId);
      if (!container) {
        return; // Already removed
      }

      try {
        await container.stop();
      } catch (error) {
        // Container might already be stopped
      }

      await container.remove();
      this.containers.delete(playgroundId);
      
      console.log(`Container removed: playground-${playgroundId}`);
    } catch (error) {
      console.error('Error removing container:', error);
      throw new AppError('Failed to remove container', 500, 'CONTAINER_REMOVE_ERROR');
    }
  }

  async executeCommand(playgroundId: string, command: string): Promise<{ output: string; exitCode: number }> {
    try {
      const container = this.containers.get(playgroundId);
      if (!container) {
        throw new AppError('Container not found', 404, 'CONTAINER_NOT_FOUND');
      }

      const exec = await container.exec({
        Cmd: ['/bin/bash', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
      });

      const stream = await exec.start({ hijack: true, stdin: false });
      
      return new Promise((resolve, reject) => {
        let output = '';
        
        stream.on('data', (chunk: Buffer) => {
          // Docker multiplexes stdout/stderr, need to handle the format
          if (chunk.length > 8) {
            output += chunk.slice(8).toString();
          }
        });

        stream.on('end', async () => {
          try {
            const inspect = await exec.inspect();
            resolve({
              output: output.trim(),
              exitCode: inspect.ExitCode || 0
            });
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error executing command:', error);
      throw new AppError('Failed to execute command', 500, 'COMMAND_EXEC_ERROR');
    }
  }

  async getContainerFiles(playgroundId: string, path: string = '/workspace'): Promise<any[]> {
    try {
      const result = await this.executeCommand(playgroundId, `find ${path} -maxdepth 3 -type f -o -type d | head -50`);
      const files = result.output.split('\n').filter(f => f.trim());
      
      return files.map(filePath => {
        const name = filePath.split('/').pop() || '';
        const isDirectory = filePath.endsWith('/') || name.indexOf('.') === -1;
        
        return {
          id: Buffer.from(filePath).toString('base64'),
          name,
          path: filePath,
          type: isDirectory ? 'folder' : 'file',
          language: isDirectory ? undefined : this.getFileLanguage(name)
        };
      });
    } catch (error) {
      console.error('Error getting container files:', error);
      return [];
    }
  }

  async readFile(playgroundId: string, filePath: string): Promise<string> {
    try {
      const result = await this.executeCommand(playgroundId, `cat "${filePath}"`);
      return result.output;
    } catch (error) {
      console.error('Error reading file:', error);
      return '';
    }
  }

  async writeFile(playgroundId: string, filePath: string, content: string): Promise<void> {
    try {
      // Escape content for shell
      const escapedContent = content.replace(/'/g, "'\"'\"'");
      await this.executeCommand(playgroundId, `echo '${escapedContent}' > "${filePath}"`);
    } catch (error) {
      console.error('Error writing file:', error);
      throw new AppError('Failed to write file', 500, 'FILE_WRITE_ERROR');
    }
  }

  private async getContainerInfo(container: Docker.Container): Promise<ContainerInfo> {
    const inspect = await container.inspect();
    const ports: { [key: string]: number } = {};

    if (inspect.NetworkSettings.Ports) {
      Object.entries(inspect.NetworkSettings.Ports).forEach(([containerPort, hostPorts]) => {
        if (hostPorts && hostPorts.length > 0) {
          const port = containerPort.split('/')[0];
          ports[port] = parseInt(hostPorts[0].HostPort);
        }
      });
    }

    return {
      id: inspect.Id,
      name: inspect.Name.replace('/', ''),
      status: inspect.State.Status,
      ports,
      created: new Date(inspect.Created)
    };
  }

  private getBaseImage(template: string): string {
    const imageMap: { [key: string]: string } = {
      'react-js': 'node:18-alpine',
      'node-js': 'node:18-alpine',
      'next-js': 'node:18-alpine',
      'python': 'python:3.11-alpine',
      'cpp': 'gcc:latest',
      'rust': 'rust:1.70-alpine',
      'empty': 'ubuntu:22.04'
    };

    return imageMap[template] || 'ubuntu:22.04';
  }

  private async pullImageIfNeeded(imageName: string): Promise<void> {
    try {
      await docker.getImage(imageName).inspect();
    } catch (error) {
      console.log(`Pulling image: ${imageName}`);
      await docker.pull(imageName);
    }
  }

  private async createInitScript(template: string): Promise<string> {
    const r2Service = R2Service;
    
    return `#!/bin/bash
set -e

echo "Setting up playground environment..."

# Install basic tools
if command -v apt-get >/dev/null 2>&1; then
    apt-get update && apt-get install -y curl wget unzip git
elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache curl wget unzip git
fi

# Create workspace
mkdir -p /workspace
cd /workspace

# Install AWS CLI for R2 access
if ! command -v aws >/dev/null 2>&1; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
fi

# Configure AWS CLI for R2
aws configure set aws_access_key_id ${process.env.R2_ACCESS_KEY_ID}
aws configure set aws_secret_access_key ${process.env.R2_SECRET_ACCESS_KEY}
aws configure set region auto

# Download template files
echo "Downloading template: ${template}"
aws s3 sync s3://${process.env.R2_BUCKET}/base/${template}/ /workspace/ --endpoint-url=${process.env.R2_ENDPOINT} || echo "Template download failed, creating basic structure"

# Create basic structure if download failed
if [ ! -f package.json ] && [ "${template}" = "react-js" ]; then
    echo '{"name":"playground","version":"1.0.0","scripts":{"dev":"echo \\"Please install dependencies first\\""},"dependencies":{}}' > package.json
    mkdir -p src
    echo 'console.log("Hello from React playground!");' > src/index.js
fi

# Install dependencies based on template
case "${template}" in
    "react-js"|"node-js"|"next-js")
        if [ -f package.json ]; then
            npm install || echo "npm install failed"
        fi
        ;;
    "python")
        if [ -f requirements.txt ]; then
            pip install -r requirements.txt || echo "pip install failed"
        fi
        ;;
    "rust")
        if [ -f Cargo.toml ]; then
            cargo fetch || echo "cargo fetch failed"
        fi
        ;;
esac

echo "Environment setup complete"

# Keep container running
tail -f /dev/null`;
  }

  private getFileLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c'
    };
    return languageMap[ext || ''] || 'plaintext';
  }
}