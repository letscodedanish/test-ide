import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewPlaygroundPage from '@/app/playground/new/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('NewPlaygroundPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders playground creation form', () => {
    render(<NewPlaygroundPage />)
    
    expect(screen.getByText('Create New Playground')).toBeInTheDocument()
    expect(screen.getByLabelText(/playground name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/template/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('shows template selection cards', () => {
    render(<NewPlaygroundPage />)
    
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('Next.js')).toBeInTheDocument()
  })

  it('allows template selection', async () => {
    const user = userEvent.setup()
    render(<NewPlaygroundPage />)
    
    const reactCard = screen.getByText('React').closest('div')
    await user.click(reactCard!)
    
    expect(screen.getByText('Selected')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<NewPlaygroundPage />)
    
    const createButton = screen.getByText('Create Playground')
    await user.click(createButton)
    
    // Button should be disabled when no name or template is selected
    expect(createButton).toBeDisabled()
  })

  it('creates playground with valid data', async () => {
    const mockPush = jest.fn()
    jest.mocked(require('next/navigation').useRouter).mockReturnValue({
      push: mockPush,
    })

    const mockFetch = jest.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test-id' }),
    } as Response)

    const user = userEvent.setup()
    render(<NewPlaygroundPage />)
    
    // Fill in form
    await user.type(screen.getByLabelText(/playground name/i), 'Test Playground')
    await user.type(screen.getByLabelText(/description/i), 'Test description')
    
    // Select template
    const reactCard = screen.getByText('React').closest('div')
    await user.click(reactCard!)
    
    // Submit form
    const createButton = screen.getByText('Create Playground')
    await user.click(createButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/playgrounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Test Playground'),
      })
    })
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/playground/test-id')
    })
  })
})