import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { FeeScheduleLineInput } from '../api/tuition-api'

export type FeeLineDraft = FeeScheduleLineInput & { key: string }

export const DEFAULT_FEE_LINES: FeeLineDraft[] = [
  {
    key: 'tuition',
    feeCode: 'TUITION',
    description: 'Tuition per unit',
    feeType: 'tuition',
    calculationMethod: 'per_unit',
    amount: 850,
  },
  {
    key: 'misc',
    feeCode: 'MISC-REG',
    description: 'Registration & miscellaneous',
    feeType: 'miscellaneous',
    calculationMethod: 'fixed',
    amount: 2500,
  },
  {
    key: 'books',
    feeCode: 'BOOKS',
    description: 'Books and learning materials',
    feeType: 'other',
    calculationMethod: 'fixed',
    amount: 1200,
  },
  {
    key: 'uniform',
    feeCode: 'UNIFORM',
    description: 'Uniform / PE attire',
    feeType: 'other',
    calculationMethod: 'fixed',
    amount: 800,
  },
]

export function newFeeLineDraft(): FeeLineDraft {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    feeCode: 'FEE',
    description: 'Fee item',
    feeType: 'miscellaneous',
    calculationMethod: 'fixed',
    amount: 0,
  }
}

type Props = {
  lines: FeeLineDraft[]
  onChange: (lines: FeeLineDraft[]) => void
}

export function FeeScheduleLineEditor({ lines, onChange }: Props) {
  const update = (index: number, patch: Partial<FeeLineDraft>) => {
    onChange(lines.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-ink)]">Fee line items</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...lines, newFeeLineDraft()])}
        >
          Add line
        </Button>
      </div>
      {lines.map((line, index) => (
        <div
          key={line.key}
          className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Input
            label="Fee code"
            value={line.feeCode}
            onChange={(e) => update(index, { feeCode: e.target.value })}
          />
          <Input
            label="Description"
            value={line.description}
            onChange={(e) => update(index, { description: e.target.value })}
            className="sm:col-span-2 lg:col-span-1"
          />
          <Select
            label="Fee type"
            value={line.feeType}
            onChange={(e) =>
              update(index, { feeType: e.target.value as FeeScheduleLineInput['feeType'] })
            }
            options={[
              { value: 'tuition', label: 'Tuition' },
              { value: 'miscellaneous', label: 'Miscellaneous' },
              { value: 'laboratory', label: 'Laboratory' },
              { value: 'other', label: 'Other (books, uniform, etc.)' },
            ]}
          />
          <Select
            label="Calculation"
            value={line.calculationMethod}
            onChange={(e) =>
              update(index, {
                calculationMethod: e.target.value as FeeScheduleLineInput['calculationMethod'],
              })
            }
            options={[
              { value: 'fixed', label: 'Fixed amount' },
              { value: 'per_unit', label: 'Per enrolled unit' },
              { value: 'per_subject', label: 'Per subject line' },
            ]}
          />
          <Input
            label="Amount (₱ or rate)"
            type="number"
            value={String(line.amount)}
            onChange={(e) => update(index, { amount: Number(e.target.value) })}
          />
          {lines.length > 1 ? (
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(lines.filter((_, i) => i !== index))}
              >
                Remove line
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
