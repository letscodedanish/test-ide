import { NextRequest, NextResponse } from 'next/server';
import { TerminalService } from '@/lib/terminal-service';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

const terminalService = TerminalService.getInstance();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, command, data, cols, rows } = body;

    switch (action) {
      case 'create':
        const session = await terminalService.createSession(id);
        return NextResponse.json({
          sessionId: session.id,
          message: 'Terminal session created'
        });

      case 'execute':
        const result = await terminalService.executeCommand(id, command);
        return NextResponse.json(result);

      case 'write':
        const sessionId = `${id}-terminal`;
        await terminalService.writeToSession(sessionId, data);
        return NextResponse.json({ message: 'Data written to terminal' });

      case 'resize':
        const resizeSessionId = `${id}-terminal`;
        await terminalService.resizeSession(resizeSessionId, cols, rows);
        return NextResponse.json({ message: 'Terminal resized' });

      case 'close':
        const closeSessionId = `${id}-terminal`;
        await terminalService.closeSession(closeSessionId);
        return NextResponse.json({ message: 'Terminal session closed' });

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