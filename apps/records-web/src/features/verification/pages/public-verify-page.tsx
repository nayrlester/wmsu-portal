import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { PageHeader, SectionCard } from '@/components/ui/page-chrome'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WmsuLogo } from '@/components/brand/wmsu-logo'

type VerifyResult = {
  authentic: boolean
  result: string
  message?: string
  documentKind?: string
  serialNumber?: string
  issuedAt?: string
  studentNumberMasked?: string
  certificationType?: string
  copyType?: string
  complianceStatus?: string
  signatureStatus?: string
  officialTemplateApplied?: boolean
  note?: string
}

export function PublicVerifyPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VerifyResult | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await apiClient.post('/public/verify', { codeOrRef: code.trim() })
      setResult((data.data ?? data) as VerifyResult)
    } catch (err) {
      const ax = err as { response?: { data?: { message?: string } } }
      setError(ax.response?.data?.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <WmsuLogo productName="TORMS" productTagline="Document verification" />
        <PageHeader
          title="Verify document"
          description="Confirm an issued transcript or certification reference. Only minimum public fields are shown."
        />
        <SectionCard title="Reference lookup">
          <form className="space-y-3" onSubmit={submit}>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Serial or verification code</span>
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. TORISS-… or VR-…"
              />
            </label>
            <Button type="submit" disabled={loading || !code.trim()}>
              {loading ? 'Checking…' : 'Verify'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {result && (
            <div className="mt-4 space-y-1 rounded border border-border bg-slate-50/80 p-3 text-sm">
              <p>
                Result:{' '}
                <span className={result.authentic ? 'text-emerald-700' : 'text-amber-700'}>
                  {result.result}
                </span>
              </p>
              {result.serialNumber && <p>Serial: {result.serialNumber}</p>}
              {result.documentKind && <p>Kind: {result.documentKind}</p>}
              {result.copyType && <p>Copy: {result.copyType}</p>}
              {result.certificationType && <p>Type: {result.certificationType}</p>}
              {result.studentNumberMasked && <p>Student: {result.studentNumberMasked}</p>}
              {result.issuedAt && <p>Issued: {new Date(result.issuedAt).toLocaleString()}</p>}
              {result.complianceStatus && <p>Compliance: {result.complianceStatus}</p>}
              {result.signatureStatus && <p>Signature: {result.signatureStatus}</p>}
              {result.note && <p className="text-xs text-slate-600">{result.note}</p>}
              {result.message && <p className="text-xs text-slate-600">{result.message}</p>}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
