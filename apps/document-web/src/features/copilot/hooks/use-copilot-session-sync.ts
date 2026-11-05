import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useCopilotStore } from '@/features/copilot/store/copilot-store'

/** Clears help desk chat when the signed-in user changes or logs out. */
export function useCopilotSessionSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const syncSessionOwner = useCopilotStore((s) => s.syncSessionOwner)

  useEffect(() => {
    syncSessionOwner(userId)
  }, [userId, syncSessionOwner])
}
