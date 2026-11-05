import { useState } from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { BorrowingStatusBadge } from '@/components/circulation/borrowing-status-badge'
import { useDialog } from '@/components/providers/dialog-provider'
import { useReturnBorrowing, useMarkBorrowingLost } from '@/hooks/use-borrowings'
import { useCirculationStore } from '@/stores/circulation-store'
import { useBorrowings } from '@/hooks/use-borrowings'

export function ReturnProcessingPanel() {
  const { showReturnPanel, selectedBorrowingId, closeReturnPanel } = useCirculationStore()
  const { confirm, toast } = useDialog()
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data } = useBorrowings({
    status: undefined,
    perPage: 100,
  })

  const borrowing = data?.borrowings.find((b) => b.id === selectedBorrowingId)
  const returnBorrow = useReturnBorrowing()
  const markLost = useMarkBorrowingLost()

  async function handleReturn() {
    if (!selectedBorrowingId) return
    setError(null)
    try {
      await returnBorrow.mutateAsync({ id: selectedBorrowingId, notes: notes || undefined })
      setNotes('')
      closeReturnPanel()
      toast.success('Book returned')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Return failed')
    }
  }

  async function handleMarkLost() {
    if (!selectedBorrowingId) return
    const approved = await confirm({
      title: 'Mark as lost',
      message: 'Mark this book as lost? A replacement fine will be assessed.',
      confirmLabel: 'Mark lost',
      tone: 'danger',
    })
    if (!approved) return
    setError(null)
    try {
      await markLost.mutateAsync(selectedBorrowingId)
      closeReturnPanel()
      toast.success('Marked as lost')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as lost')
    }
  }

  return (
    <Dialog
      open={showReturnPanel}
      onClose={closeReturnPanel}
      title="Process return"
      description="Return an active loan or mark as lost"
    >
      {borrowing ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-900">{borrowing.bookTitle}</span>
              <BorrowingStatusBadge status={borrowing.status} />
            </div>
            <p className="mt-2 text-slate-600">Member: {borrowing.memberName}</p>
            <p className="text-slate-600">Transaction: {borrowing.transactionNumber}</p>
            {borrowing.dueAt && (
              <p className="text-slate-600">
                Due: {new Date(borrowing.dueAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="return-notes">Return notes (optional)</Label>
            <Input
              id="return-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condition notes..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeReturnPanel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-purple-700"
              onClick={handleMarkLost}
              disabled={markLost.isPending}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Mark lost
            </Button>
            <Button onClick={handleReturn} disabled={returnBorrow.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {returnBorrow.isPending ? 'Processing...' : 'Confirm return'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Borrowing record not found.</p>
      )}
    </Dialog>
  )
}
