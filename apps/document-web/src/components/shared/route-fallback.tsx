import { Skeleton } from '@/components/ui/skeleton'

export function RouteFallback() {
  return (
    <div className="space-y-4 p-2" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
