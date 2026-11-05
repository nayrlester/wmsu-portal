import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

export type UserMenuItem = {
  id: string
  label: string
  icon?: ReactNode
  onSelect?: () => void
  destructive?: boolean
}

export type UserMenuProps = {
  name: string
  email?: string
  role?: string
  avatarUrl?: string
  items?: UserMenuItem[]
  onSignOut?: () => void
  className?: string
}

export function UserMenu({ name, email, role, avatarUrl, items = [], onSignOut, className }: UserMenuProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-left shadow-sm hover:bg-[var(--color-muted)]',
            className
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--color-wmsu-navy)] text-xs font-semibold text-white">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{name}</span>
            {role ? <span className="block truncate text-xs text-[var(--color-muted-foreground)]">{role}</span> : null}
          </span>
          <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-card)]"
        >
          <div className="border-b border-[var(--color-border)] px-3 py-2">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{name}</p>
            {email ? <p className="text-xs text-[var(--color-muted-foreground)]">{email}</p> : null}
          </div>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none hover:bg-[var(--color-muted)]"
            onSelect={(event) => event.preventDefault()}
          >
            <UserRound className="h-4 w-4" />
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none hover:bg-[var(--color-muted)]"
            onSelect={(event) => event.preventDefault()}
          >
            <Settings className="h-4 w-4" />
            Preferences
          </DropdownMenu.Item>
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none hover:bg-[var(--color-muted)]',
                item.destructive && 'text-[var(--color-destructive)]'
              )}
              onSelect={() => item.onSelect?.()}
            >
              {item.icon}
              {item.label}
            </DropdownMenu.Item>
          ))}
          {onSignOut ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-destructive)] outline-none hover:bg-red-50"
                onSelect={() => onSignOut()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenu.Item>
            </>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
