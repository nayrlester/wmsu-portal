import { useState } from 'react'
import { toast } from '@/shared/store/toast-store'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { OnboardingShell } from '@/features/onboarding/components/onboarding-shell'
import { OnboardingStepActions } from '@/features/onboarding/components/onboarding-step-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function OnboardingTeamStep() {
  const draft = useOnboardingStore((state) => state.draft)
  const updateDraft = useOnboardingStore((state) => state.updateDraft)
  const dispatch = useOnboardingStore((state) => state.dispatch)
  const [email, setEmail] = useState('')

  const addEmail = () => {
    const value = email.trim().toLowerCase()
    if (!value || !value.includes('@')) return
    if (draft.inviteEmails.includes(value)) return
    updateDraft({ inviteEmails: [...draft.inviteEmails, value] })
    setEmail('')
  }

  const handleNext = () => {
    if (draft.inviteEmails.length) {
      toast.success('Invites queued', `${draft.inviteEmails.length} teammate(s) will be invited.`)
    }
    dispatch({ type: 'NEXT' })
  }

  return (
    <OnboardingShell
      title="Invite your team"
      description="Add colleagues who will review, approve, or track documents."
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              placeholder="colleague@agency.gov.ph"
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addEmail())}
            />
          </div>
          <Button type="button" className="mt-8" variant="outline" onClick={addEmail}>
            Add
          </Button>
        </div>
        {draft.inviteEmails.length > 0 && (
          <ul className="space-y-2" aria-label="Pending invites">
            {draft.inviteEmails.map((invite) => (
              <li
                key={invite}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                {invite}
                <button
                  type="button"
                  aria-label={`Remove ${invite}`}
                  onClick={() =>
                    updateDraft({
                      inviteEmails: draft.inviteEmails.filter((item) => item !== invite),
                    })
                  }
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <OnboardingStepActions
        step="team"
        onBack={() => dispatch({ type: 'BACK' })}
        onNext={handleNext}
        onSkip={() => dispatch({ type: 'SKIP' })}
      />
    </OnboardingShell>
  )
}
