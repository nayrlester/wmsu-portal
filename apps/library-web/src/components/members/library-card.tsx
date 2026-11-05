import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/lib/utils'
import { MEMBER_TYPE_LABELS } from '@/types/members'
import type { MemberCardData } from '@/types/members'

interface LibraryCardProps {
  card: MemberCardData
  className?: string
  showPrint?: boolean
}

export function LibraryCard({ card, className, showPrint = true }: LibraryCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, card.qrPayload, {
      width: 160,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  }, [card.qrPayload])

  function handlePrint() {
    const canvas = canvasRef.current
    if (!canvas) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Library Card - ${card.fullName}</title>
      <style>
        body { font-family: system-ui; display: flex; justify-content: center; padding: 40px; }
        .card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; width: 320px; text-align: center; }
        .name { font-size: 18px; font-weight: 600; margin: 12px 0 4px; }
        .meta { color: #64748b; font-size: 13px; }
        .id { font-family: monospace; font-size: 14px; margin-top: 12px; letter-spacing: 1px; }
      </style></head><body>
      <div class="card">
        <p style="font-size:12px;color:#64748b;text-transform:uppercase">${card.tenantName}</p>
        <img src="${canvas.toDataURL()}" width="160" height="160"/>
        <div class="name">${card.fullName}</div>
        <div class="meta">${MEMBER_TYPE_LABELS[card.memberType]}${card.department ? ` · ${card.department}` : ''}</div>
        <div class="id">${card.libraryCardNumber}</div>
      </div></body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm',
        className
      )}
    >
      <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-400">
        {card.tenantName}
      </p>
      <p className="text-center text-sm font-semibold text-slate-700">Library Card</p>

      <div className="my-4 flex justify-center">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>

      <p className="text-center text-lg font-semibold text-slate-900">{card.fullName}</p>
      <p className="text-center text-sm text-slate-500">
        {MEMBER_TYPE_LABELS[card.memberType]}
        {card.department && ` · ${card.department}`}
      </p>
      <p className="mt-3 text-center font-mono text-sm tracking-widest text-slate-800">
        {card.libraryCardNumber}
      </p>

      {showPrint && (
        <button
          type="button"
          onClick={handlePrint}
          className="mt-4 w-full rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Print card
        </button>
      )}
    </div>
  )
}

export function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { width: 200, margin: 1 })
}
