import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentsApi } from '@/api'
import { toast } from '@/shared/store/toast-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { OnboardingShell } from '@/features/onboarding/components/onboarding-shell'
import { OnboardingStepActions } from '@/features/onboarding/components/onboarding-step-actions'
import { FormFileUpload } from '@/components/desk-app/forms/form-file-upload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'

interface DocumentForm {
  files: File[]
}

export function OnboardingDocumentStep() {
  const navigate = useNavigate()
  const draft = useOnboardingStore((state) => state.draft)
  const updateDraft = useOnboardingStore((state) => state.updateDraft)
  const dispatch = useOnboardingStore((state) => state.dispatch)
  const [loading, setLoading] = useState(false)
  const { control, getValues } = useForm<DocumentForm>({ defaultValues: { files: [] } })

  const finish = async () => {
    setLoading(true)
    try {
      if (draft.documentTitle.trim().length >= 3) {
        const doc = await documentsApi.create({
          title: draft.documentTitle,
          priority: 'medium',
        })
        const files = getValues('files')
        if (files.length) {
          const { versions } = await documentsApi.versions(doc.id)
          const versionId = versions[0]?.id
          if (versionId) {
            for (const file of files) {
              await documentsApi.uploadFile(doc.id, versionId, file)
            }
          }
        }
        toast.success('First document created', doc.trackingNumber)
      }
      dispatch({ type: 'COMPLETE' })
    } catch {
      toast.error('Document creation failed', 'You can create one from the Documents page.')
      dispatch({ type: 'COMPLETE' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      title="Upload your first document"
      description="Create a tracked document to see routing, approvals, and public tracking in action."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="doc-title">Document title *</Label>
          <Input
            id="doc-title"
            value={draft.documentTitle}
            onChange={(event) => updateDraft({ documentTitle: event.target.value })}
            placeholder="e.g. Q1 Budget Request"
          />
        </div>
        <FormFileUpload name="files" control={control} label="Attachments (optional)" />
      </div>
      <OnboardingStepActions
        step="document"
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={finish}
        nextLabel="Finish setup"
        loading={loading}
        disableNext={draft.documentTitle.trim().length < 3}
      />
      <button
        type="button"
        className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-primary"
        onClick={() => {
          dispatch({ type: 'COMPLETE' })
          navigate('/app/dashboard')
        }}
      >
        Skip and go to dashboard
      </button>
    </OnboardingShell>
  )
}
