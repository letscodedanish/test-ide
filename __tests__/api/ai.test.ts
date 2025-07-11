import { NextRequest } from 'next/server'
import { POST as completionHandler } from '@/app/api/ai/completion/route'
import { POST as inlineHandler } from '@/app/api/ai/inline/route'
import { POST as explainHandler } from '@/app/api/ai/explain/route'

// Mock the AI service
jest.mock('@/lib/ai-service', () => ({
  AIService: {
    getInstance: () => ({
      generateCodeCompletion: jest.fn().mockResolvedValue({
        content: 'console.log("Hello, World!");',
        type: 'code',
        confidence: 0.9,
      }),
      generateInlineSuggestion: jest.fn().mockResolvedValue('() => {'),
      explainCode: jest.fn().mockResolvedValue({
        content: 'This code logs a message to the console.',
        type: 'explanation',
      }),
    }),
  },
}))

// Mock rate limiter
jest.mock('@/lib/rate-limiter', () => ({
  aiRateLimiter: {
    checkLimit: jest.fn(),
  },
  inlineRateLimiter: {
    checkLimit: jest.fn(),
  },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
  }),
}))

describe('/api/ai', () => {
  describe('POST /api/ai/completion', () => {
    it('should generate code completion', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/completion', {
        method: 'POST',
        body: JSON.stringify({
          type: 'completion',
          language: 'javascript',
          prompt: 'Create a hello world function',
          code: 'function hello',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      })

      const response = await completionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.content).toBeDefined()
      expect(data.data.type).toBe('code')
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/completion', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      })

      const response = await completionHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })
  })

  describe('POST /api/ai/inline', () => {
    it('should generate inline suggestion', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/inline', {
        method: 'POST',
        body: JSON.stringify({
          code: 'const myFunction = ',
          language: 'javascript',
          cursorPosition: 18,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      })

      const response = await inlineHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.suggestion).toBeDefined()
    })
  })

  describe('POST /api/ai/explain', () => {
    it('should explain code', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          code: 'console.log("Hello, World!");',
          language: 'javascript',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      })

      const response = await explainHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.explanation).toBeDefined()
    })
  })
})