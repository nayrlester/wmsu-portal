import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminApi, formatBytes, formatCurrency, type AdminPlan } from '@/lib/admin-api'

function formatLimit(value: number | null, suffix = ''): string {
  if (value === null) return 'Unlimited'
  return `${value.toLocaleString()}${suffix}`
}

export function AdminPlansPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<AdminPlan>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => adminApi.plans().then((r) => r.plans),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminPlan> }) => adminApi.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      setEditingId(null)
      setDraft({})
    },
  })

  const startEdit = (plan: AdminPlan) => {
    setEditingId(plan.id)
    setDraft({
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      isActive: plan.isActive,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Plans</h1>
        <p className="text-muted-foreground">Subscription tiers and limits</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-40 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : data?.map((plan) => (
              <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : undefined}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{plan.slug}</p>
                    </div>
                    {!plan.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Inactive</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editingId === plan.id ? (
                    <div className="space-y-2">
                      <Input
                        value={draft.name ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Plan name"
                      />
                      <Input
                        value={draft.description ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        placeholder="Description"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={draft.monthlyPrice ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, monthlyPrice: Number(e.target.value) }))}
                          placeholder="Monthly"
                        />
                        <Input
                          type="number"
                          value={draft.annualPrice ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, annualPrice: Number(e.target.value) }))}
                          placeholder="Annual"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: plan.id, data: draft })}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">{plan.description ?? 'No description'}</p>
                      <div className="flex gap-4 text-sm">
                        <span>{formatCurrency(plan.monthlyPrice)}/mo</span>
                        <span>{formatCurrency(plan.annualPrice)}/yr</span>
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>Users: {formatLimit(plan.maxUsers)}</li>
                        <li>Documents: {formatLimit(plan.maxDocuments)}</li>
                        <li>Storage: {plan.maxStorageBytes ? formatBytes(plan.maxStorageBytes) : 'Unlimited'}</li>
                      </ul>
                      <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>
                        Edit plan
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  )
}
