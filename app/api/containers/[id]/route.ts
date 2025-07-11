import { NextRequest, NextResponse } from 'next/server';
import { DockerService } from '@/lib/docker-service';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

const dockerService = DockerService.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const container = await dockerService.getContainer(id);
    
    if (!container) {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(container);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, template, language } = body;

    switch (action) {
      case 'create':
        const container = await dockerService.createContainer({
          playgroundId: id,
          template: template || 'empty',
          language: language || 'javascript'
        });
        return NextResponse.json(container);

      case 'start':
        const startedContainer = await dockerService.startContainer(id);
        return NextResponse.json(startedContainer);

      case 'stop':
        await dockerService.stopContainer(id);
        return NextResponse.json({ message: 'Container stopped' });

      case 'remove':
        await dockerService.removeContainer(id);
        return NextResponse.json({ message: 'Container removed' });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error);
  }
}