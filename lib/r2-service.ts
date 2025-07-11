import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const R2_ENDPOINT = 'https://ad08bde786909448bfaac2692349abd4.r2.cloudflarestorage.com';
const R2_ACCESS_KEY_ID = '8d94442465c24b84c7c205bac45af892';
const R2_SECRET_ACCESS_KEY = 'ef4d0d25e924a0954f1b38e3e004b97f9455c61792e164a24d8ae7810e5a51c6';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export interface BoilerplateFile {
  name: string;
  content: string;
  path: string;
}

export interface BoilerplateTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  icon: string;
  files: BoilerplateFile[];
}

export class R2Service {
  private static bucketName = 'repl';

  /**
   * Get available templates from R2 only
   */
  static async getAvailableTemplates(): Promise<string[]> {
    console.log('Fetching templates from R2...');
    
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'base/',
        Delimiter: '/',
      });

      const response = await r2Client.send(command);
      const templates: string[] = [];

      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const templateName = prefix.Prefix.replace('base/', '').replace('/', '');
            if (templateName) {
              templates.push(templateName);
            }
          }
        }
      }

      console.log(`Available templates from R2: ${templates.join(', ')}`);
      return templates;
    } catch (error) {
      console.error('Error fetching available templates:', error);
      throw new Error('Failed to fetch templates from R2');
    }
  }

  /**
   * Get boilerplate files for a specific template from R2 only
   */
  static async getBoilerplateFiles(templateId: string): Promise<BoilerplateFile[]> {
    console.log(`Fetching boilerplate files for template: ${templateId}`);
    
    try {
      const prefix = `base/${templateId}/`;
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await r2Client.send(command);
      const files: BoilerplateFile[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key !== prefix) {
            const fileName = object.Key.replace(prefix, '');
            
            // Skip directories
            if (fileName.endsWith('/')) {
              continue;
            }

            try {
              const fileContent = await this.getFileContent(object.Key);
              files.push({
                name: fileName,
                content: fileContent,
                path: fileName,
              });
            } catch (error) {
              console.error(`Error fetching file ${fileName}:`, error);
            }
          }
        }
      }

      console.log(`Found ${files.length} files for template ${templateId}`);
      
      if (files.length === 0) {
        throw new Error(`No files found for template ${templateId} in R2`);
      }

      return files;
    } catch (error) {
      console.error(`Error fetching boilerplate for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get content of a specific file
   */
  private static async getFileContent(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await r2Client.send(command);
      
      if (response.Body) {
        const content = await response.Body.transformToString();
        return content;
      }

      return '';
    } catch (error) {
      console.error(`Error fetching file content for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get boilerplate template with metadata from R2 only
   */
  static async getBoilerplateTemplate(templateId: string): Promise<BoilerplateTemplate | null> {
    console.log(`Getting boilerplate template: ${templateId}`);
    
    try {
      const files = await this.getBoilerplateFiles(templateId);
      
      if (files.length === 0) {
        console.log(`No template found for ${templateId} in R2`);
        return null;
      }

      const templateMetadata = this.getTemplateMetadata(templateId);
      
      return {
        id: templateId,
        name: templateMetadata.name,
        description: templateMetadata.description,
        language: templateMetadata.language,
        icon: templateMetadata.icon,
        files,
      };
    } catch (error) {
      console.error(`Error getting template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Get template metadata
   */
  private static getTemplateMetadata(templateId: string): {
    name: string;
    description: string;
    language: string;
    icon: string;
  } {
    const metadata: Record<string, any> = {
      'react-js': {
        name: 'React',
        description: 'Modern React application with Vite',
        language: 'javascript',
        icon: '⚛️',
      },
      'node-js': {
        name: 'Node.js',
        description: 'Node.js server with Express',
        language: 'javascript',
        icon: '🟢',
      },
      'python': {
        name: 'Python',
        description: 'Python application with Flask',
        language: 'python',
        icon: '🐍',
      },
      'next-js': {
        name: 'Next.js',
        description: 'Full-stack React framework',
        language: 'javascript',
        icon: '▲',
      },
      'cpp': {
        name: 'C++',
        description: 'C++ development environment',
        language: 'cpp',
        icon: '🔥',
      },
      'rust': {
        name: 'Rust',
        description: 'Systems programming with Rust',
        language: 'rust',
        icon: '🦀',
      },
      'empty': {
        name: 'Empty',
        description: 'Start from scratch',
        language: 'text',
        icon: '📄',
      },
    };

    return metadata[templateId] || {
      name: templateId,
      description: `${templateId} template`,
      language: 'text',
      icon: '📄',
    };
  }

  /**
   * Get boilerplate download URL for container init
   */
  static getBoilerplateDownloadUrl(templateId: string): string {
    return `https://${this.bucketName}.r2.cloudflarestorage.com/base/${templateId}/`;
  }

  /**
   * Generate init script for container to download boilerplate
   */
  static generateBoilerplateInitScript(templateId: string): string {
    const downloadUrl = this.getBoilerplateDownloadUrl(templateId);
    
    return `#!/bin/bash
set -e

echo "Downloading boilerplate for ${templateId}..."

# Create workspace directory
mkdir -p /workspace
cd /workspace

# Configure AWS CLI for R2
aws configure set aws_access_key_id ${R2_ACCESS_KEY_ID}
aws configure set aws_secret_access_key ${R2_SECRET_ACCESS_KEY}
aws configure set region auto
aws configure set output json

# Download template files
aws s3 sync s3://${this.bucketName}/base/${templateId}/ /workspace/ --endpoint-url ${R2_ENDPOINT}

# Set proper permissions
chmod -R 755 /workspace
chown -R 1001:1001 /workspace

echo "Template files downloaded successfully"
ls -la /workspace/
`;
  }
} 