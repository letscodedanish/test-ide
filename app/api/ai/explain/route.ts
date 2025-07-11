import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { handleApiError, validateRequired } from '@/lib/error-handler';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Skip authentication in development mode
    let user = { id: 'dev-user', email: 'dev@example.com', name: 'Dev User' };
    
    if (process.env.NODE_ENV === 'production') {
      user = await getAuthenticatedUser(request);
    }
    
    // Rate limiting
    await aiRateLimiter.checkLimit(request, user.id);
    
    const body = await request.json();
    
    // Validate required fields
    validateRequired(body, ['code', 'language']);
    
    const { code, language } = body;
    
    const aiService = AIService.getInstance();
    const explanation = await aiService.explainCode(code, language);
    
    return NextResponse.json({
      success: true,
      explanation: explanation.content,
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}