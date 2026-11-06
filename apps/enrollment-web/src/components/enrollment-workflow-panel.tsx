import { Badge, Button } from '@wmsu/ui'
import { Link } from 'react-router-dom'

import type { EnrollmentWorkflowView } from '@/lib/usis-api'
import { formatCurrency } from '@/lib/utils'

export type { EnrollmentWorkflowView }

function stepBadge(state: EnrollmentWorkflowView['workflowSteps'][0]['state']) {
  if (state === 'complete') return <Badge>Done</Badge>
  if (state === 'current') return <Badge>Current</Badge>
  if (state === 'skipped') return <Badge>Skipped</Badge>
  return <span className="text-xs text-[var(--color-muted-foreground)]">Pending</span>
}

type Props = {
  data: EnrollmentWorkflowView
  showSchedule?: boolean
  showTuitionLinks?: boolean
}

export function EnrollmentWorkflowPanel({
  data,
  showSchedule = true,
  showTuitionLinks = true,
}: Props) {
  const enr = data?.enrollment
  if (!enr) return null
  const steps = data.workflowSteps ?? []
  const scheduleRows = data.scheduleRows ?? []
  const tuition = data.tuitionSummary
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">Enrollment workflow</h3>
          <Badge>{enr.status}</Badge>
          {enr.academicYearCode ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {enr.academicYearCode}
            </span>
          ) : null}
          {enr.courseCode ? (
            <span className="text-sm" data-testid="enrollment-course">
              Course {enr.courseCode}
              {enr.courseName ? ` — ${enr.courseName}` : ''}
            </span>
          ) : null}
          {enr.sectionCode ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">
              Section {enr.sectionCode}
            </span>
          ) : null}
        </div>
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li
              key={step.key}
              data-testid={`workflow-step-${step.key}`}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{step.label}</p>
                {step.detail ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">{step.detail}</p>
                ) : null}
              </div>
              {stepBadge(step.state)}
            </li>
          ))}
        </ol>
        {showTuitionLinks ? (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {tuition?.netAmount != null ? (
              <span>
                Net assessed: <strong>{formatCurrency(tuition.netAmount)}</strong>
              </span>
            ) : null}
            {tuition?.minimumDueRequired != null ? (
              <span>
                Min due: <strong>{formatCurrency(tuition.minimumDueRequired)}</strong>
              </span>
            ) : null}
            <Link to="/student/assessments">
              <Button type="button" size="sm" variant="outline">
                Assessments
              </Button>
            </Link>
            <Link to="/student/payments">
              <Button type="button" size="sm" variant="outline">
                Payments
              </Button>
            </Link>
            <Link to="/student/schedule">
              <Button type="button" size="sm" variant="outline">
                Schedule
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
      {showSchedule && scheduleRows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
          <table className="min-w-full text-sm" data-testid="enrollment-course-subjects">
            <thead className="bg-[var(--color-surface-muted)]/50 text-left">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Schedule</th>
                <th className="px-3 py-2">Faculty</th>
                <th className="px-3 py-2 text-right">Units</th>
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row) => (
                <tr key={row.lineId} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">{row.subjectCode}</span>
                    <div>{row.subjectTitle}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.sectionCode ?? '—'}</td>
                  <td className="px-3 py-2">
                    {row.meetingLabels.length ? (
                      <ul className="space-y-0.5">
                        {row.meetingLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.facultyNames.length ? row.facultyNames.join('; ') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">{row.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
