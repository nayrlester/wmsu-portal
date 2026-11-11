import { useCallback } from 'react'
import {
  PersonnelSearchSelect as BasePersonnelSearchSelect,
  type PersonnelSearchSelectProps,
} from '@wmsu/ui'
import { fetchPersonnelSearch } from '@/lib/usis-api'

type Props = Omit<PersonnelSearchSelectProps, 'onSearch'>

export function PersonnelSearchSelect(props: Props) {
  const onSearch = useCallback((query: string) => fetchPersonnelSearch(query), [])
  return <BasePersonnelSearchSelect {...props} onSearch={onSearch} />
}
