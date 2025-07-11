import { spawn, IPty } from 'node-pty';
import { DockerService } from './docker-service';
import { AppError } from './error-handler';

export interface TerminalSession {
  id: string;
  playgroundId: string;
  pty?: IPty;
  isActive: boolean;
  lastActivity: Date;
}

export class TerminalService {
  private static instance: TerminalService;
  private sessions = new Map<string, TerminalSession>();
  private dockerService = DockerService.getInstance();

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  async createSession(playgroundId: string): Promise<TerminalSession> {
    try {
      // Check if container exists and is running
      const container = await this.dockerService.getContainer(playgroundId);
      if (!container) {
        throw new AppError('Container not found', 404, 'CONTAINER_NOT_FOUND');
      }

      if (container.status !== 'running') {
        await this.dockerService.startContainer(playgroundId);
      }

      const sessionId = `${playgroundId}-terminal`;
      
      // Clean up existing session if any
      await this.closeSession(sessionId);

      // Create new PTY session that connects to the Docker container
      const pty = spawn('docker', [
        'exec', '-it', `playground-${playgroundId}`, '/bin/bash'
      ], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: '/workspace',
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          PS1: '\\u@\\h:\\w$ '
        }
      });

      const session: TerminalSession = {
        id: sessionId,
        playgroundId,
        pty,
        isActive: true,
        lastActivity: new Date()
      };

      this.sessions.set(sessionId, session);

      // Set up PTY event handlers
      pty.onData((data) => {
        session.lastActivity = new Date();
        // Data will be handled by WebSocket connection
      });

      pty.onExit((exitCode) => {
        console.log(`Terminal session ${sessionId} exited with code ${exitCode}`);
        session.isActive = false;
      });

      console.log(`Terminal session created: ${sessionId}`);
      return session;
    } catch (error) {
      console.error('Error creating terminal session:', error);
      throw new AppError('Failed to create terminal session', 500, 'TERMINAL_CREATE_ERROR');
    }
  }

  async getSession(sessionId: string): Promise<TerminalSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async writeToSession(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pty || !session.isActive) {
      throw new AppError('Terminal session not found or inactive', 404, 'TERMINAL_NOT_FOUND');
    }

    session.pty.write(data);
    session.lastActivity = new Date();
  }

  async resizeSession(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pty || !session.isActive) {
      throw new AppError('Terminal session not found or inactive', 404, 'TERMINAL_NOT_FOUND');
    }

    session.pty.resize(cols, rows);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.pty) {
        session.pty.kill();
      }
      session.isActive = false;
      this.sessions.delete(sessionId);
      console.log(`Terminal session closed: ${sessionId}`);
    }
  }

  // Clean up inactive sessions
  async cleanupSessions(): Promise<void> {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      
      if (!session.isActive || inactiveTime > maxInactiveTime) {
        await this.closeSession(sessionId);
      }
    }
  }

  // Alternative method for executing commands without PTY (for API calls)
  async executeCommand(playgroundId: string, command: string): Promise<{ output: string; exitCode: number }> {
    return await this.dockerService.executeCommand(playgroundId, command);
  }
}

// Start cleanup interval
setInterval(() => {
  TerminalService.getInstance().cleanupSessions();
}, 5 * 60 * 1000); // Every 5 minutes