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
    validateRequired(body, ['type', 'language', 'prompt']);
    
    const { type, code, language, prompt, context } = body;
    
    // Validate AI request type
    const validTypes = ['completion', 'explanation', 'refactor', 'debug', 'chat'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid AI request type' },
        { status: 400 }
      );
    }
    
    const aiService = AIService.getInstance();
    const response = await aiService.generateCodeCompletion({
      type,
      code,
      language,
      prompt,
      context,
    });
    
    // Log AI usage for analytics
    console.log('AI Request:', {
      userId: user.id,
      type,
      language,
      timestamp: new Date().toISOString(),
      promptLength: prompt.length,
      responseLength: response.content.length,
    });
    
    return NextResponse.json({
      success: true,
      data: response,
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}