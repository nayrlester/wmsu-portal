import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileText } from 'lucide-react'
import { EmptyState, StatusBadge } from '@/components/shared/status-badge'

describe('StatusBadge', () => {
  it('renders human-readable status label', () => {
    render(<StatusBadge status="pending_approval" />)
    expect(screen.getByText('pending approval')).toBeInTheDocument()
  })

  it('applies status color classes', () => {
    const { container } = render(<StatusBadge status="approved" />)
    expect(container.firstChild).toHaveClass('ring-1')
  })
})

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState
        icon={FileText}
        title="No documents"
        description="Create your first document"
        action={<button type="button">Create</button>}
      />
    )

    expect(screen.getByRole('heading', { name: 'No documents' })).toBeInTheDocument()
    expect(screen.getByText('Create your first document')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})
