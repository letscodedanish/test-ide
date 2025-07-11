import { NextRequest } from 'next/server';
import { AppError } from './error-handler';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async checkLimit(request: NextRequest, userId?: string): Promise<void> {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(request)
      : userId || this.getClientIP(request);
    
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Initialize or get existing record
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }
    
    const record = this.store[key];
    
    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      throw new AppError(
        `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        429,
        'RATE_LIMIT_EXCEEDED',
        { resetIn, limit: this.config.maxRequests }
      );
    }
    
    // Increment counter
    record.count++;
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }
}

// Rate limiter instances
export const aiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute per user
});

export const inlineRateLimiter = new RateLimiter({
  windowMs: 10 * 1000, // 10 seconds
  maxRequests: 10, // 10 inline suggestions per 10 seconds
});