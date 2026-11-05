import { Link } from 'react-router-dom'
import { BookOpen, MoreHorizontal } from 'lucide-react'
import type { TopBook } from '@/types/analytics'

export function TopBooksPanel({ books }: { books: TopBook[] }) {
  if (books.length === 0) {
    return (
      <div className="ui-card p-6 text-sm text-[var(--color-muted-foreground)]">
        No borrowing data yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {books.map((book) => (
        <div
          key={book.bookId}
          className="ui-card flex items-center gap-4 px-4 py-3 transition hover:-translate-y-px"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/books/${book.bookId}`}
              className="block truncate font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]"
            >
              {book.title}
            </Link>
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
              {book.authorNames || 'Unknown author'} · {book.loanCount} loans
            </p>
          </div>
          <p className="hidden text-sm font-medium text-[var(--color-muted-foreground)] sm:block">
            {book.activeLoans} active
          </p>
          <MoreHorizontal className="h-4 w-4 text-[#9aa0c3]" />
        </div>
      ))}
    </div>
  )
}
