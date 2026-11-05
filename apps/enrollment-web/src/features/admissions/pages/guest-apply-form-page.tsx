import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  SearchableSelect,
  Select,
} from '@wmsu/ui'
import { getApiErrorMessage } from '@/lib/api-client'
import {
  applyOnlineAdmission,
  fetchPublicAdmissionForm,
  fetchPublicAdmissionPrograms,
} from '@/lib/usis-api'
import {
  ACADEMIC_STRAND_OPTIONS,
  GUEST_ORG_CODE,
  GuestPortalShell,
  SECONDARY_BACKGROUND_OPTIONS,
  persistGuestReceipt,
  type AcademicStrand,
  type SecondaryBackground,
} from '@/features/admissions/guest-portal-shared'

export function GuestApplyFormPage() {
  const navigate = useNavigate()
  const formQuery = useQuery({
    queryKey: ['guest', 'admission-form'],
    queryFn: () => fetchPublicAdmissionForm(GUEST_ORG_CODE),
  })
  const programsQuery = useQuery({
    queryKey: ['guest', 'programs'],
    queryFn: () => fetchPublicAdmissionPrograms(GUEST_ORG_CODE),
  })

  const [classification, setClassification] = useState<'new' | 'transferee' | 'returning'>('new')
  const [secondaryBackground, setSecondaryBackground] = useState<SecondaryBackground>('undecided')
  const [academicStrand, setAcademicStrand] = useState<AcademicStrand | ''>('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [programId, setProgramId] = useState('')
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({})
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({})
  const [termsOk, setTermsOk] = useState(false)
  const [privacyOk, setPrivacyOk] = useState(false)
  const [receipt, setReceipt] = useState<{
    applicationNumber: string
    entranceExamAssigned: boolean
  } | null>(null)
  const [submitLocked, setSubmitLocked] = useState(false)
  const submitInFlight = useRef(false)

  const form = formQuery.data
  const selectedStrandMeta = ACADEMIC_STRAND_OPTIONS.find((s) => s.value === academicStrand)
  const requiredReady = useMemo(() => {
    if (!form) return false
    for (const field of form.formFields) {
      if (field.required && !String(formAnswers[field.key] ?? '').trim()) return false
    }
    for (const q of form.surveyQuestions) {
      if (q.required && !String(surveyAnswers[q.key] ?? '').trim()) return false
    }
    if (secondaryBackground === 'shs_academic' && !academicStrand) return false
    return Boolean(firstName.trim() && lastName.trim() && email.trim() && termsOk && privacyOk)
  }, [
    form,
    formAnswers,
    surveyAnswers,
    firstName,
    lastName,
    email,
    termsOk,
    privacyOk,
    secondaryBackground,
    academicStrand,
  ])

  const applyMutation = useMutation({
    mutationFn: () =>
      applyOnlineAdmission({
        orgCode: GUEST_ORG_CODE,
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        email: email.trim(),
        mobile: mobile.trim() || undefined,
        birthDate: birthDate || undefined,
        programId: programId || undefined,
        classification,
        formAnswers: {
          ...formAnswers,
          secondaryBackground,
          ...(secondaryBackground === 'shs_academic' && academicStrand ? { academicStrand } : {}),
        },
        surveyAnswers,
        termsAccepted: termsOk,
        privacyConsentAccepted: privacyOk,
        autoAssignEntranceExam: classification === 'new',
      }),
    onSuccess: (row) => {
      persistGuestReceipt(row.applicationNumber, email.trim())
      setReceipt({
        applicationNumber: row.applicationNumber,
        entranceExamAssigned: row.entranceExamAssigned,
      })
      if (row.entranceExamAssigned) {
        navigate(
          `/apply/exam?applicationNumber=${encodeURIComponent(row.applicationNumber)}&email=${encodeURIComponent(email.trim())}`
        )
      }
    },
    onError: () => {
      submitInFlight.current = false
      setSubmitLocked(false)
    },
  })

  function submitApplication() {
    if (submitInFlight.current || submitLocked || applyMutation.isPending || !!receipt) return
    submitInFlight.current = true
    setSubmitLocked(true)
    applyMutation.mutate()
  }

  return (
    <GuestPortalShell
      title="Online application"
      subtitle="Complete the published admissions form, accept terms and privacy consent, then continue to exam or status tracking."
    >
      {formQuery.isError ? (
        <Alert variant="danger" title="Form unavailable">
          {getApiErrorMessage(formQuery.error)}
        </Alert>
      ) : null}

      {!form && !formQuery.isLoading ? (
        <Alert variant="warning" title="No active admission form">
          Admissions has not published an online form yet. Please check back later or contact the
          Admissions Office.
        </Alert>
      ) : null}

      {receipt ? (
        <Alert variant="success" title="Application submitted">
          Your application number is <strong>{receipt.applicationNumber}</strong>. Keep this with
          the email you used.{' '}
          {receipt.entranceExamAssigned ? (
            <>You were assigned to an online entrance exam.</>
          ) : (
            <>
              Continue at{' '}
              <Link className="underline" to="/apply/status">
                status
              </Link>
              .
            </>
          )}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{form?.name ?? 'Application form'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="guestClass" label="Applicant type">
              <Select
                id="guestClass"
                value={classification}
                onChange={(e) => setClassification(e.target.value as typeof classification)}
              >
                <option value="new">New / freshman</option>
                <option value="transferee">Transferee</option>
                <option value="returning">Returning / old student</option>
              </Select>
            </FormField>
            <FormField id="guestSecondaryBg" label="Secondary / SHS background">
              <Select
                id="guestSecondaryBg"
                value={secondaryBackground}
                onChange={(e) => {
                  const next = e.target.value as SecondaryBackground
                  setSecondaryBackground(next)
                  if (next !== 'shs_academic') setAcademicStrand('')
                }}
              >
                {SECONDARY_BACKGROUND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>
            {secondaryBackground === 'shs_academic' ? (
              <FormField id="guestStrand" label="Academic Track strand">
                <Select
                  id="guestStrand"
                  value={academicStrand}
                  onChange={(e) => setAcademicStrand(e.target.value as AcademicStrand | '')}
                >
                  <option value="">Select strand</option>
                  {ACADEMIC_STRAND_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} — {s.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-white/70 px-3 py-2 text-sm text-[var(--color-muted-foreground)] md:col-span-1">
                {SECONDARY_BACKGROUND_OPTIONS.find((o) => o.value === secondaryBackground)?.hint}{' '}
                Strand is not required.
              </div>
            )}
            <FormField id="guestProgram" label="Intended program (optional now)">
              <SearchableSelect
                id="guestProgram"
                value={programId}
                onChange={setProgramId}
                placeholder="Search program, or leave blank for later…"
                options={(programsQuery.data ?? []).map((p) => ({
                  value: p.id,
                  label: `${p.code} — ${p.name}`,
                }))}
              />
            </FormField>
            {selectedStrandMeta ? (
              <div className="md:col-span-2 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm">
                <p className="font-medium text-[var(--color-ink)]">
                  {selectedStrandMeta.label}: {selectedStrandMeta.name}
                </p>
                <p className="mt-1 text-[var(--color-muted-foreground)]">
                  Typical interests: {selectedStrandMeta.interests.join(' · ')}
                </p>
              </div>
            ) : null}
            <FormField id="guestFirst" label="First name">
              <Input
                id="guestFirst"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </FormField>
            <FormField id="guestMiddle" label="Middle name">
              <Input
                id="guestMiddle"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </FormField>
            <FormField id="guestLast" label="Last name">
              <Input
                id="guestLast"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormField>
            <FormField id="guestEmail" label="Email">
              <Input
                id="guestEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField id="guestMobile" label="Mobile">
              <Input id="guestMobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </FormField>
            <FormField id="guestBirth" label="Birth date">
              <Input
                id="guestBirth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </FormField>
          </div>

          {(form?.formFields ?? []).map((field) => (
            <FormField key={field.key} id={`ff-${field.key}`} label={field.label}>
              {field.type === 'textarea' ? (
                <textarea
                  id={`ff-${field.key}`}
                  className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                  value={formAnswers[field.key] ?? ''}
                  onChange={(e) =>
                    setFormAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              ) : field.type === 'select' ? (
                <Select
                  id={`ff-${field.key}`}
                  value={formAnswers[field.key] ?? ''}
                  onChange={(e) =>
                    setFormAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={`ff-${field.key}`}
                  type={
                    field.type === 'email' || field.type === 'tel' || field.type === 'date'
                      ? field.type
                      : 'text'
                  }
                  value={formAnswers[field.key] ?? ''}
                  onChange={(e) =>
                    setFormAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              )}
            </FormField>
          ))}

          {(form?.surveyQuestions ?? []).map((q) => (
            <FormField key={q.key} id={`sq-${q.key}`} label={q.prompt}>
              <Input
                id={`sq-${q.key}`}
                value={surveyAnswers[q.key] ?? ''}
                onChange={(e) => setSurveyAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
              />
            </FormField>
          ))}

          <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white/80 p-4 text-sm">
            <p className="font-medium text-[var(--color-ink)]">Terms</p>
            <p className="text-[var(--color-muted-foreground)] whitespace-pre-wrap">
              {form?.termsText || 'Terms will appear when a form is published.'}
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={termsOk}
                onChange={(e) => setTermsOk(e.target.checked)}
              />
              <span>I accept the terms and agreements</span>
            </label>
            <p className="font-medium text-[var(--color-ink)]">Data privacy</p>
            <p className="text-[var(--color-muted-foreground)] whitespace-pre-wrap">
              {form?.privacyConsentText || 'Privacy consent text will appear when published.'}
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={privacyOk}
                onChange={(e) => setPrivacyOk(e.target.checked)}
              />
              <span>I consent to processing of my personal data for admissions</span>
            </label>
          </div>

          {applyMutation.isError ? (
            <Alert variant="danger" title="Application failed">
              {getApiErrorMessage(applyMutation.error)}
            </Alert>
          ) : null}

          <Button
            type="button"
            disabled={
              !requiredReady || applyMutation.isPending || submitLocked || !!receipt || !form
            }
            onClick={submitApplication}
          >
            {applyMutation.isPending || submitLocked ? 'Submitting…' : 'Submit application'}
          </Button>
        </CardContent>
      </Card>
    </GuestPortalShell>
  )
}
