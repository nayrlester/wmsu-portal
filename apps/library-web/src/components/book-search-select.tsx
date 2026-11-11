import { useCallback } from 'react'
import { AsyncSearchSelect } from '@wmsu/ui'
import { fetchBooks } from '@/lib/books-api'

type Props = {
  id?: string
  value: string
  onChange: (bookId: string) => void
  placeholder?: string
  disabled?: boolean
  valueLabel?: string | null
}

export function BookSearchSelect(props: Props) {
  const onSearch = useCallback(async (query: string) => {
    const { books } = await fetchBooks({ search: query, perPage: 20, page: 1 })
    return books.map((b) => ({
      id: b.id,
      label: [b.title, b.isbn13, b.isbn10].filter(Boolean).join(' · '),
    }))
  }, [])
  return (
    <AsyncSearchSelect
      {...props}
      onSearch={onSearch}
      placeholder={props.placeholder ?? 'Search catalog by title or ISBN…'}
    />
  )
}
