import { cn } from '@/lib/utils'

function generateBars(value: string): number[] {
  return value.split('').map((char, i) => {
    const code = char.charCodeAt(0)
    return ((code * (i + 7)) % 8) + 2
  })
}

export function BarcodeDisplay({
  value,
  label,
  className,
}: {
  value: string
  label?: string
  className?: string
}) {
  const bars = generateBars(value)

  return (
    <div className={cn('inline-flex flex-col items-center gap-2', className)}>
      {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex h-12 items-end gap-px">
          {bars.map((height, i) => (
            <div
              key={i}
              className="w-1 bg-slate-900"
              style={{ height: `${height * 4}px` }}
            />
          ))}
        </div>
        <p className="mt-2 whitespace-nowrap text-center font-mono text-sm tracking-widest text-slate-800">{value}</p>
      </div>
    </div>
  )
}
