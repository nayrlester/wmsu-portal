import type { ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  direction: SortDirection
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface DataTableColumn<T> {
  key: string
  header: string
  className?: string
  sortable?: boolean
  render?: (row: T) => ReactNode
}

export interface RowAction {
  id: string
  label: string
  icon?: ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  onClick: () => void
}
