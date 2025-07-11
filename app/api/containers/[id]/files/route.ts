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
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '/workspace';
    
    const files = await dockerService.getContainerFiles(id, path);
    return NextResponse.json(files);
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
    const { action, filePath, content } = body;

    switch (action) {
      case 'read':
        const fileContent = await dockerService.readFile(id, filePath);
        return NextResponse.json({ content: fileContent });

      case 'write':
        await dockerService.writeFile(id, filePath, content);
        return NextResponse.json({ message: 'File saved' });

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