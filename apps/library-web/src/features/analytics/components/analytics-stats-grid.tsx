import { Link } from 'react-router-dom'
import {
  BookOpen,
  Users,
  ArrowLeftRight,
  AlertTriangle,
  Bookmark,
  Library,
  TrendingUp,
  ClipboardList,
} from 'lucide-react'
import type { AnalyticsOverview } from '@/types/analytics'
import { cn } from '@/lib/utils'

interface CategoryCardProps {
  label: string
  value: number | string
  hint?: string
  icon: typeof BookOpen
  tone: string
  to?: string
  delayClass?: string
}

function CategoryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  to,
  delayClass,
}: CategoryCardProps) {
  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.5rem] p-5 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5',
        'animate-fade-up',
        tone,
        delayClass
      )}
    >
      <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-55">{hint}</p>}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    )
  }

  return content
}

export function AnalyticsStatsGrid({ overview }: { overview: AnalyticsOverview }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <CategoryCard
        label="Books"
        value={overview.totalBooks}
        hint={`${overview.totalCopies} copies`}
        icon={BookOpen}
        tone="bg-[#f3e8ee] text-[#8a4b63]"
        to="/books"
        delayClass="animate-fade-up-delay-1"
      />
      <CategoryCard
        label="Members"
        value={overview.activeMembers}
        hint="Active patrons"
        icon={Users}
        tone="bg-[#e4f0ef] text-[#3f6f6a]"
        to="/members"
        delayClass="animate-fade-up-delay-2"
      />
      <CategoryCard
        label="Active loans"
        value={overview.activeLoans}
        hint={`${overview.availableCopies} available`}
        icon={ArrowLeftRight}
        tone="bg-[#f4ebe0] text-[#8a6238]"
        to="/circulation"
        delayClass="animate-fade-up-delay-3"
      />
      <CategoryCard
        label="Overdue"
        value={overview.overdue}
        hint="Needs follow-up"
        icon={AlertTriangle}
        tone="bg-[#f2e4e4] text-[#8b4a4a]"
        to="/circulation"
      />
      <CategoryCard
        label="Reservations"
        value={overview.activeReservations}
        hint="Pending or ready"
        icon={Bookmark}
        tone="bg-[#ebe8f5] text-[#5c5485]"
        to="/reservations"
      />
      <CategoryCard
        label="Checkouts"
        value={overview.checkoutsThisMonth}
        hint="This month"
        icon={TrendingUp}
        tone="bg-[#e5ebf5] text-[#455f8a]"
      />
      <CategoryCard
        label="Returns"
        value={overview.returnsThisMonth}
        hint="This month"
        icon={Library}
        tone="bg-[#e3eef2] text-[#3f6b7a]"
      />
      <CategoryCard
        label="Attendance"
        value={overview.attendanceToday ?? 0}
        hint="Today"
        icon={ClipboardList}
        tone="bg-[#efeefe] text-[#5c5485]"
        to="/attendance"
      />
      <CategoryCard
        label="On shelf"
        value={
          overview.totalCopies > 0
            ? `${Math.round((overview.availableCopies / overview.totalCopies) * 100)}%`
            : '—'
        }
        hint="Availability rate"
        icon={BookOpen}
        tone="bg-[#e6f0e7] text-[#45664a]"
      />
    </div>
  )
}
