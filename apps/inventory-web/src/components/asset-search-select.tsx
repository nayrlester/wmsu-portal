import { useCallback } from 'react'
import { AsyncSearchSelect } from '@wmsu/ui'
import { fetchAssets } from '@/features/assets/api/assets-api'

type Props = {
  id?: string
  value: string
  onChange: (assetId: string) => void
  placeholder?: string
  disabled?: boolean
  valueLabel?: string | null
  className?: string
}

export function AssetSearchSelect(props: Props) {
  const onSearch = useCallback(async (query: string) => {
    const { data } = await fetchAssets({ search: query, limit: 20 })
    return data.map((asset) => ({
      id: asset.id,
      label: `${asset.tagNumber} · ${asset.name}`,
    }))
  }, [])
  return (
    <AsyncSearchSelect
      {...props}
      onSearch={onSearch}
      placeholder={props.placeholder ?? 'Search asset by tag or name…'}
    />
  )
}
