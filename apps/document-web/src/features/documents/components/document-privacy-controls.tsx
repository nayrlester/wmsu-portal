import { Globe, Lock } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from '@/shared/store/toast-store'
import type { UseMutationResult } from '@tanstack/react-query'

interface DocumentPrivacyControlsProps {
  visibility?: 'public' | 'private' | string | null
  canEdit: boolean
  updateMutation: Pick<UseMutationResult<unknown, Error, Record<string, unknown>>, 'mutate' | 'isPending'>
}

export function DocumentPrivacyControls({
  visibility,
  canEdit,
  updateMutation,
}: DocumentPrivacyControlsProps) {
  const current = visibility === 'public' ? 'public' : 'private'
  const isPublic = current === 'public'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        {isPublic ? (
          <Globe className="h-4 w-4 text-emerald-600" aria-hidden />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
        <span className="font-medium">{isPublic ? 'Public document' : 'Private document'}</span>
      </div>

      {canEdit ? (
        <div className="space-y-2">
          <Label htmlFor="document-privacy">Tracking visibility</Label>
          <Select
            id="document-privacy"
            value={current}
            disabled={updateMutation.isPending}
            onChange={(e) =>
              updateMutation.mutate(
                { visibility: e.target.value },
                {
                  onSuccess: () => toast.success('Privacy updated'),
                  onError: () => toast.error('Update failed', 'Could not update privacy.'),
                }
              )
            }
          >
            <option value="private">Private — hide public track link and QR</option>
            <option value="public">Public — anyone with tracking # can view status</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Public documents show the QR code and tracking page below.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {isPublic
            ? 'This document is publicly trackable. Only editors can change privacy while the document is a draft or returned.'
            : 'This document is private. Public tracking is disabled.'}
        </p>
      )}
    </div>
  )
}
