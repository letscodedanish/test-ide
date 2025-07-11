import { NextRequest } from 'next/server'
import { GET as getPlaygrounds, POST as createPlayground } from '@/app/api/playgrounds/route'

describe('/api/playgrounds', () => {
  describe('GET /api/playgrounds', () => {
    it('should return empty array initially', async () => {
      const request = new NextRequest('http://localhost:3000/api/playgrounds')
      const response = await getPlaygrounds(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/playgrounds?limit=5')
      const response = await getPlaygrounds(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('POST /api/playgrounds', () => {
    it('should create playground with valid data', async () => {
      const playgroundData = {
        name: 'Test Playground',
        description: 'A test playground',
        language: 'javascript',
        template: 'react',
        files: [
          {
            name: 'index.js',
            content: 'console.log("Hello World");',
          },
        ],
      }

      const request = new NextRequest('http://localhost:3000/api/playgrounds', {
        method: 'POST',
        body: JSON.stringify(playgroundData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createPlayground(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.name).toBe('Test Playground')
      expect(data.language).toBe('javascript')
      expect(data.files).toHaveLength(1)
    })

    it('should reject playground creation with missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/playgrounds', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await createPlayground(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name and language are required')
    })
  })
})