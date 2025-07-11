import { NextRequest, NextResponse } from 'next/server';
import { TerminalService } from '@/lib/terminal-service';
import { handleApiError } from '@/lib/error-handler';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const terminalService = TerminalService.getInstance();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get or create terminal session
    const sessionId = `${id}-terminal`;
    let session = await terminalService.getSession(sessionId);
    
    if (!session) {
      session = await terminalService.createSession(id);
    }

    return NextResponse.json({
      sessionId: session.id,
      isActive: session.isActive,
      message: 'Terminal session ready'
    });
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
    const { input, action, command } = body;

    const sessionId = `${id}-terminal`;

    switch (action) {
      case 'execute':
        const result = await terminalService.executeCommand(id, command || input);
        return NextResponse.json(result);

      case 'write':
        await terminalService.writeToSession(sessionId, input);
        return NextResponse.json({ success: true });

      case 'resize':
        const { cols, rows } = body;
        await terminalService.resizeSession(sessionId, cols, rows);
        return NextResponse.json({ success: true });

      case 'close':
        await terminalService.closeSession(sessionId);
        return NextResponse.json({ success: true });

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