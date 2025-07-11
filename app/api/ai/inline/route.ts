import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { inlineRateLimiter } from '@/lib/rate-limiter';
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
    
    // Rate limiting for inline suggestions
    await inlineRateLimiter.checkLimit(request, user.id);
    
    const body = await request.json();
    
    // Validate required fields
    validateRequired(body, ['code', 'language', 'cursorPosition']);
    
    const { code, language, cursorPosition } = body;
    
    const aiService = AIService.getInstance();
    const suggestion = await aiService.generateInlineSuggestion(
      code,
      language,
      cursorPosition
    );
    
    return NextResponse.json({
      success: true,
      suggestion,
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}