import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { AppError } from './error-handler';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export async function verifyToken(token: string): Promise<User> {
  try {
    const decoded = verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (error) {
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }
}

export async function getAuthenticatedUser(request: NextRequest): Promise<User> {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('auth-token')?.value;
  
  let token: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }
  
  if (!token) {
    throw new AppError('Authentication required', 401, 'NO_TOKEN');
  }
  
  return await verifyToken(token);
}

export function requireAuth(handler: (request: NextRequest, user: User, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const user = await getAuthenticatedUser(request);
      return await handler(request, user, ...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Authentication failed', 401, 'AUTH_FAILED');
    }
  };
}