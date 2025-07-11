import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIPromptBar } from '@/components/ai/ai-prompt-bar'

// Mock fetch
global.fetch = jest.fn()

// Mock toast
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

describe('AIPromptBar', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onSuggestion: jest.fn(),
    language: 'javascript',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when visible', () => {
    render(<AIPromptBar {...defaultProps} />)
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask AI to help with your code...')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<AIPromptBar {...defaultProps} isVisible={false} />)
    
    expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument()
  })

  it('shows quick action buttons', () => {
    render(<AIPromptBar {...defaultProps} />)
    
    expect(screen.getByText('Complete Code')).toBeInTheDocument()
    expect(screen.getByText('Explain Code')).toBeInTheDocument()
    expect(screen.getByText('Refactor')).toBeInTheDocument()
    expect(screen.getByText('Find Bugs')).toBeInTheDocument()
    expect(screen.getByText('Ask AI')).toBeInTheDocument()
  })

  it('submits prompt on form submission', async () => {
    const mockFetch = jest.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          content: 'Generated code',
          type: 'code',
        },
      }),
    } as Response)

    const user = userEvent.setup()
    const onSuggestion = jest.fn()
    
    render(<AIPromptBar {...defaultProps} onSuggestion={onSuggestion} />)
    
    const input = screen.getByPlaceholderText('Ask AI to help with your code...')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Create a function')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Create a function'),
      })
    })
    
    await waitFor(() => {
      expect(onSuggestion).toHaveBeenCalledWith('Generated code', 'code')
    })
  })

  it('handles quick actions', async () => {
    const user = userEvent.setup()
    render(<AIPromptBar {...defaultProps} selectedText="console.log('test')" />)
    
    const explainButton = screen.getByText('Explain Code')
    await user.click(explainButton)
    
    const input = screen.getByPlaceholderText('Ask AI to help with your code...')
    expect(input).toHaveValue('Explain what this code does')
  })

  it('shows selected text badge when text is selected', () => {
    render(<AIPromptBar {...defaultProps} selectedText="const x = 5;" />)
    
    expect(screen.getByText('12 chars selected')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    
    render(<AIPromptBar {...defaultProps} onClose={onClose} />)
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })
})