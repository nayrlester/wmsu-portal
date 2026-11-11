import { useCallback } from 'react'
import { AsyncSearchSelect } from '@wmsu/ui'
import { fetchItems } from '@/features/items/api/items-api'

type Props = {
  id?: string
  value: string
  onChange: (itemId: string) => void
  placeholder?: string
  disabled?: boolean
  valueLabel?: string | null
  className?: string
}

export function ItemSearchSelect(props: Props) {
  const onSearch = useCallback(async (query: string) => {
    const { data } = await fetchItems({ search: query, limit: 20 })
    return data.map((item) => ({
      id: item.id,
      label: `${item.sku} · ${item.name}`,
    }))
  }, [])
  return (
    <AsyncSearchSelect
      {...props}
      onSearch={onSearch}
      placeholder={props.placeholder ?? 'Search item by SKU or name…'}
    />
  )
}
