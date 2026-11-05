import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CommandPaletteSearch } from '@/components/desk/command-palette-search'
import { cn } from '@/lib/utils'

interface GlobalSearchProps {
  compact?: boolean
}

export function GlobalSearch({ compact }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (isModK) {
        event.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setQ('')
  }

  return (
    <>
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={compact ? 'Search…' : 'Search documents, keywords, and people…'}
          className={cn(
            'h-9 rounded-lg border-border/80 bg-muted/40 pl-9 pr-16',
            compact && 'min-w-0 sm:w-36'
          )}
          value={q}
          onChange={(event) => {
            setQ(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          aria-label="Search"
          aria-expanded={open}
          aria-controls="command-palette-search"
        />
        {!compact && (
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        )}
      </div>

      <CommandPaletteSearch
        open={open}
        onClose={handleClose}
        query={q}
        onQueryChange={setQ}
      />
    </>
  )
}
