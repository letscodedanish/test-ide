import { NextRequest, NextResponse } from 'next/server';
import { DockerService } from '@/lib/docker-service';
import { handleApiError } from '@/lib/error-handler';

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

const dockerService = DockerService.getInstance();

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

    // Check if container already exists
    try {
      const existingContainer = await dockerService.getContainer(id);
      if (existingContainer && existingContainer.status === 'running') {
        console.log(`Container for playground ${id} is already running`);
        return NextResponse.json({
          message: 'Container already running',
          status: 'running',
          container: existingContainer
        });
      }
      
      if (existingContainer && existingContainer.status !== 'running') {
        // Start existing container
        const startedContainer = await dockerService.startContainer(id);
        playground.isRunning = true;
        globalPlaygroundStorage.set(id, playground);
        
        return NextResponse.json({
          message: 'Container started successfully',
          status: 'running',
          container: startedContainer
        });
      }
    } catch (error) {
      // Container doesn't exist, which is expected for new playgrounds
    }

    // Create new container
    const container = await dockerService.createContainer({
      playgroundId: id,
      template: playground.template,
      language: playground.language
    });
    
    // Mark as running in storage
    playground.isRunning = true;
    globalPlaygroundStorage.set(id, playground);

    console.log(`Container for playground ${id} started successfully`);

    return NextResponse.json({
      message: 'Container started successfully',
      status: 'running',
      container
    });

  } catch (error) {
    console.error('Error starting container:', error);
    return handleApiError(error);
  }
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

    // Stop the container
    try {
      await dockerService.stopContainer(id);
      console.log(`Container for playground ${id} stopped successfully`);
    } catch (error) {
      console.log(`Container for playground ${id} was not running`);
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
    return handleApiError(error);
  }
}