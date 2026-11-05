import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-chrome'
import { Spinner } from '@/components/ui/spinner'
import { getApiErrorMessage, apiClient } from '@/lib/api-client'
import {
  fetchOrSeries,
  fetchUfmsSettings,
  seedOfficialCoa,
  updateUfmsSettings,
} from '../api/config-api'

export function ConfigPage() {
  const queryClient = useQueryClient()
  const [hardBudgetStop, setHardBudgetStop] = useState(false)
  const [uimsApiUrl, setUimsApiUrl] = useState('')
  const [uimsServiceApiKey, setUimsServiceApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [pushResult, setPushResult] = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: ['ufms-settings'],
    queryFn: fetchUfmsSettings,
  })

  const orSeriesQuery = useQuery({
    queryKey: ['or-series'],
    queryFn: fetchOrSeries,
  })

  useEffect(() => {
    if (settingsQuery.data) {
      setHardBudgetStop(Boolean(settingsQuery.data.hard_budget_stop))
      setUimsApiUrl(String(settingsQuery.data.uims_api_url ?? ''))
      setUimsServiceApiKey(String(settingsQuery.data.uims_service_api_key ?? ''))
    }
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateUfmsSettings({
        hardBudgetStop,
        uimsApiUrl: uimsApiUrl || null,
        uimsServiceApiKey: uimsServiceApiKey || null,
      }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['ufms-settings'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const seedMutation = useMutation({
    mutationFn: seedOfficialCoa,
    onSuccess: (data) => {
      setError(null)
      setSeedResult(
        `Seed ${data?.seedVersion ?? 'loaded'}: ${data?.accounts ?? '?'} accounts, ${data?.funds ?? '?'} funds`
      )
      queryClient.invalidateQueries({ queryKey: ['ufms-settings'] })
      queryClient.invalidateQueries({ queryKey: ['or-series'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const pushMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/integrations/uims/push')
      return data.data ?? data
    },
    onSuccess: (data) => {
      setError(null)
      setPushResult(
        data?.skipped
          ? String(data.reason ?? 'UIMS push skipped')
          : `Pushed ${data?.pushed ?? 0} pending UIMS event(s)`
      )
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finance configuration"
        description="OR series, UACS COA seed, budget enforcement, and UIMS integration."
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <h2 className="text-lg font-semibold">Budget enforcement</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hardBudgetStop}
            onChange={(e) => setHardBudgetStop(e.target.checked)}
          />
          Hard budget stop on purchase requisitions
        </label>
        <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Save settings'}
        </Button>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <h2 className="text-lg font-semibold">UIMS integration</h2>
        <Input
          placeholder="UIMS API base URL (e.g. http://127.0.0.1:3500)"
          value={uimsApiUrl}
          onChange={(e) => setUimsApiUrl(e.target.value)}
        />
        <Input
          placeholder="UIMS service API key"
          value={uimsServiceApiKey}
          onChange={(e) => setUimsServiceApiKey(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save UIMS settings
          </Button>
          <Button
            variant="secondary"
            disabled={pushMutation.isPending}
            onClick={() => pushMutation.mutate()}
          >
            {pushMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Push pending to UIMS'}
          </Button>
        </div>
        {pushResult ? <p className="text-sm text-emerald-700">{pushResult}</p> : null}
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <h2 className="text-lg font-semibold">Official UACS COA seed</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Upserts multi-fund chart, tuition/POS/misc OR series, and AR GL mapping without wiping
          settings.
        </p>
        <Button disabled={seedMutation.isPending} onClick={() => seedMutation.mutate()}>
          {seedMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Load official COA seed'}
        </Button>
        {seedResult ? <p className="text-sm text-emerald-700">{seedResult}</p> : null}
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-lg font-semibold">OR series</h2>
        {orSeriesQuery.isLoading ? <Spinner className="mt-4 h-5 w-5" /> : null}
        <ul className="mt-4 space-y-2 text-sm">
          {(orSeriesQuery.data ?? []).map(
            (row: { id: string; seriesCode: string; prefix: string; nextNumber: number }) => (
              <li key={row.id}>
                {row.seriesCode}: {row.prefix}
                {String(row.nextNumber).padStart(6, '0')}
              </li>
            )
          )}
        </ul>
      </section>
    </div>
  )
}
