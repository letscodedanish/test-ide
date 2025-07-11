import { NextRequest, NextResponse } from 'next/server';
import * as k8s from '@kubernetes/client-node';
import { R2Service } from '@/lib/r2-service';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Global storage for playground data
let globalPlaygroundStorage: Map<string, any>;

if (typeof globalThis !== 'undefined') {
  if (!(globalThis as any).playgroundStorage) {
    (globalThis as any).playgroundStorage = new Map();
  }
  globalPlaygroundStorage = (globalThis as any).playgroundStorage;
} else {
  globalPlaygroundStorage = new Map();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const playground = globalPlaygroundStorage.get(id);
    
    if (!playground) {
      return NextResponse.json(
        { error: 'Playground not found' },
        { status: 404 }
      );
    }

    console.log(`Starting container for playground ${id} with template: ${playground.template}`);

    // Initialize Kubernetes client
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const containerName = `playground-${id}`;
    const namespace = 'default';

    // Check if pod already exists
    try {
      const existingPod = await k8sApi.readNamespacedPod({
        name: containerName,
        namespace: namespace
      });
      if (existingPod.status?.phase === 'Running') {
        console.log(`Container ${containerName} is already running`);
        return NextResponse.json({
          message: 'Container already running',
          status: 'running',
          containerName
        });
      }
    } catch (error) {
      // Pod doesn't exist, which is expected
    }

    // Create pod with init container for R2 template download
    const pod = await createPodWithTemplate(k8sApi, containerName, namespace, playground.template);
    
    // Mark as running in storage
    playground.isRunning = true;
    globalPlaygroundStorage.set(id, playground);

    console.log(`Container ${containerName} started successfully`);

    return NextResponse.json({
      message: 'Container started successfully',
      status: 'starting',
      containerName
    });

  } catch (error) {
    console.error('Error starting container:', error);
    return NextResponse.json(
      { error: 'Failed to start container' },
      { status: 500 }
    );
  }
}

async function createPodWithTemplate(
  k8sApi: k8s.CoreV1Api,
  containerName: string,
  namespace: string,
  templateName: string
): Promise<any> {
  
  // Get the template for language detection
  const template = await R2Service.getBoilerplateTemplate(templateName);
  const language = template?.language || 'javascript';
  
  // Select base image based on language
  const baseImage = getBaseImageForLanguage(language);
  
  const podSpec = {
    metadata: {
      name: containerName,
      labels: {
        app: 'playground',
        template: templateName
      }
    },
    spec: {
      initContainers: [
        {
          name: 'template-downloader',
          image: 'amazon/aws-cli:2.13.0',
          command: ['/bin/sh'],
          args: [
            '-c',
            `
            # Configure AWS CLI for R2
            aws configure set aws_access_key_id "8d94442465c24b84c7c205bac45af892"
            aws configure set aws_secret_access_key "ef4d0d25e924a0954f1b38e3e004b97f9455c61792e164a24d8ae7810e5a51c6"
            aws configure set region us-east-1
            
            # Download template files from R2
            echo "Downloading template files for ${templateName}..."
            aws s3 sync s3://repl/repl/base/${templateName}/ /workspace/ --endpoint-url=https://8d94442465c24b84c7c205bac45af892.r2.cloudflarestorage.com --no-verify-ssl
            
            # Set proper permissions
            chmod -R 755 /workspace
            chown -R 1001:1001 /workspace
            
            echo "Template files downloaded successfully"
            ls -la /workspace/
            `
          ],
          volumeMounts: [
            {
              name: 'workspace',
              mountPath: '/workspace'
            }
          ],
          securityContext: {
            runAsUser: 0 // Root for init container to set permissions
          }
        }
      ],
      containers: [
        {
          name: 'playground',
          image: baseImage,
          command: ['/bin/bash'],
          args: ['-c', 'while true; do sleep 3600; done'], // Keep container running
          workingDir: '/workspace',
          volumeMounts: [
            {
              name: 'workspace',
              mountPath: '/workspace'
            }
          ],
          resources: {
            requests: {
              memory: '512Mi',
              cpu: '250m'
            },
            limits: {
              memory: '1Gi',
              cpu: '500m'
            }
          },
          securityContext: {
            runAsUser: 1001,
            runAsNonRoot: true,
            allowPrivilegeEscalation: false
          },
          env: [
            {
              name: 'TEMPLATE_NAME',
              value: templateName
            },
            {
              name: 'LANGUAGE',
              value: language
            }
          ]
        }
      ],
      volumes: [
        {
          name: 'workspace',
          emptyDir: {}
        }
      ],
      restartPolicy: 'Never'
    }
  };

  return await k8sApi.createNamespacedPod({
    namespace: namespace,
    body: podSpec
  });
}

function getBaseImageForLanguage(language: string): string {
  const imageMap: { [key: string]: string } = {
    'javascript': 'node:18-alpine',
    'typescript': 'node:18-alpine',
    'python': 'python:3.11-alpine',
    'next-js': 'node:18-alpine',
    'react-js': 'node:18-alpine',
    'node-js': 'node:18-alpine',
    'rust': 'rust:1.70-alpine',
    'cpp': 'gcc:11-alpine',
    'empty': 'ubuntu:22.04'
  };
  
  return imageMap[language] || 'ubuntu:22.04';
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const playground = globalPlaygroundStorage.get(id);
    
    if (!playground) {
      return NextResponse.json(
        { error: 'Playground not found' },
        { status: 404 }
      );
    }

    console.log(`Stopping container for playground ${id}`);

    // Initialize Kubernetes client
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const containerName = `playground-${id}`;
    const namespace = 'default';

    // Delete the pod
    try {
      await k8sApi.deleteNamespacedPod({
        name: containerName,
        namespace: namespace
      });
      console.log(`Container ${containerName} stopped successfully`);
    } catch (error) {
      console.log(`Container ${containerName} was not running`);
    }

    // Mark as stopped in storage
    playground.isRunning = false;
    globalPlaygroundStorage.set(id, playground);
    
    return NextResponse.json({
      message: 'Container stopped successfully',
      status: 'stopped'
    });

  } catch (error) {
    console.error('Error stopping container:', error);
    return NextResponse.json(
      { error: 'Failed to stop container' },
      { status: 500 }
    );
  }
}