import { useCallback } from 'react'
import { AsyncSearchSelect } from '@wmsu/ui'
import { fetchWarehouses } from '@/features/warehouses/api/warehouses-api'

type Props = {
  id?: string
  value: string
  onChange: (warehouseId: string) => void
  placeholder?: string
  disabled?: boolean
  valueLabel?: string | null
  className?: string
}

export function WarehouseSearchSelect(props: Props) {
  const onSearch = useCallback(async (query: string) => {
    const { data } = await fetchWarehouses({ search: query, limit: 30 })
    return data.map((wh) => ({
      id: wh.id,
      label: `${wh.code} · ${wh.name}`,
    }))
  }, [])
  return (
    <AsyncSearchSelect
      {...props}
      onSearch={onSearch}
      placeholder={props.placeholder ?? 'Search warehouse by code or name…'}
    />
  )
}
