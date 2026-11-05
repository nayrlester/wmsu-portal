import { Link } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@wmsu/ui'
import { GuestPortalShell } from '@/features/admissions/guest-portal-shared'

export function GuestApplyLandingPage() {
  return (
    <GuestPortalShell
      title="Apply to WMSU"
      subtitle="Guest applicants can submit an application, take the online entrance examination (when scheduled), view results, choose a program, and track admission — without a student account."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Start a new application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              For new / freshman, transferee, and returning students. You will receive an application
              number to use for exam access and status checks.
            </p>
            <Button asChild>
              <Link to="/apply/start">Begin application</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Continue your journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Already applied? Look up your status, take or retake the entrance exam, select a
              program, and submit requirements.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/apply/status">Check status / results</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/apply/exam">Take entrance exam</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Process flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--color-muted-foreground)]">
          <p>
            <strong className="text-[var(--color-ink)]">New / freshman:</strong> Apply (optional SHS
            Academic strand ABM/STEM/HUMSS/GAS, or mark Not SHS) → online entrance exam → view result
            → program guidance → select program → submit requirements → await Admit → student portal
            enrollment.
          </p>
          <p>
            <strong className="text-[var(--color-ink)]">Transferee:</strong> Apply → TOR / interview
            (Admissions schedules) → requirements → Admit → enrollment.
          </p>
          <p>
            <strong className="text-[var(--color-ink)]">Returning:</strong> Apply → clearance /
            re-admission review → requirements → Admit → enrollment.
          </p>
        </CardContent>
      </Card>
    </GuestPortalShell>
  )
}
