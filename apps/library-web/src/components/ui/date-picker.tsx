import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const
const POPOVER_WIDTH = 268
const POPOVER_EST_HEIGHT = 300

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDisplayDate(value: string) {
  const date = parseDateValue(value)
  if (!date) return ''
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month)
  const startOffset = first.getDay()
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: Array<{ date: Date; inMonth: boolean }> = []

  for (let i = 0; i < startOffset; i++) {
    const date = new Date(month.getFullYear(), month.getMonth(), -startOffset + i + 1)
    cells.push({ date, inMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(month.getFullYear(), month.getMonth(), day),
      inMonth: true,
    })
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]!.date
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    })
  }

  return cells
}

interface DatePickerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = 'Select date',
  disabled = false,
  className,
}: DatePickerProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const selected = parseDateValue(value)
  const minDate = min ? parseDateValue(min) : null
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selected ?? minDate ?? new Date())
  )

  useEffect(() => {
    if (!open) return
    setVisibleMonth(startOfMonth(selected ?? minDate ?? new Date()))
  }, [open, selected, minDate])

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }

    function updatePosition() {
      const trigger = rootRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < POPOVER_EST_HEIGHT && rect.top > POPOVER_EST_HEIGHT
      const rawLeft = Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 12)
      const left = Math.max(12, rawLeft)
      const top = openUp
        ? Math.max(12, rect.top - POPOVER_EST_HEIGHT - 8)
        : Math.min(rect.bottom + 8, window.innerHeight - POPOVER_EST_HEIGHT - 12)

      setCoords({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  function isDisabled(date: Date) {
    if (!minDate) return false
    return date < minDate
  }

  function selectDate(date: Date) {
    if (isDisabled(date)) return
    onChange(toDateValue(date))
    setOpen(false)
  }

  const popover =
    open && coords
      ? createPortal(
          <div
            ref={popoverRef}
            id={listId}
            role="dialog"
            aria-label="Choose date"
            style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
            className="fixed z-[80] overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
              <button
                type="button"
                onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-0.5 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map(({ date, inMonth }) => {
                const selectedDay = selected ? sameDay(date, selected) : false
                const isToday = sameDay(date, today)
                const disabledDay = isDisabled(date)

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => selectDate(date)}
                    className={cn(
                      'flex h-8 w-full items-center justify-center rounded-full text-sm transition',
                      !inMonth && 'text-slate-300',
                      inMonth && !selectedDay && 'text-slate-700 hover:bg-[var(--color-primary-soft)]',
                      selectedDay &&
                        'bg-[var(--color-primary)] font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]',
                      !selectedDay && isToday && inMonth && 'ring-1 ring-[var(--color-primary)]/35',
                      disabledDay && 'cursor-not-allowed opacity-35 hover:bg-transparent'
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  const next = toDateValue(today)
                  if (minDate && today < minDate) return
                  onChange(next)
                  setVisibleMonth(startOfMonth(today))
                  setOpen(false)
                }}
                className="rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]"
              >
                Today
              </button>
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              ) : (
                <span className="text-xs text-slate-400">Pick a day</span>
              )}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-full border border-transparent bg-[var(--color-primary-soft)] px-4 text-left text-sm text-[var(--color-ink)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-[var(--color-primary)]/35'
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-[#9aa0c3]')}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </button>
      {popover}
    </div>
  )
}
