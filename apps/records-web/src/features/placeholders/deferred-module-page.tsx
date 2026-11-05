import { PageHeader, SectionCard } from '@/components/ui/page-chrome'

export function DeferredModulePage({
  title,
  stage,
}: {
  title: string
  stage: string
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={`Deferred until ${stage}.`} />
      <SectionCard>
        <p className="text-sm text-slate-600">
          This module is intentionally not implemented in the current TORMS stage. Existing
          foundation and transcript-request work remains available under Transcript Requests.
        </p>
      </SectionCard>
    </div>
  )
}
