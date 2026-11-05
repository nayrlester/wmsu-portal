// import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { FileText, QrCode } from 'lucide-react'
// import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/marketing/marketing-motion'

export function MarketingHero() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden border-b border-border/50">
      <div className="marketing-grain pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
      <div className="marketing-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-24 pt-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-32 lg:pt-28">
        <div className="max-w-xl">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-[12px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Built for LGUs, companies, and offices
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Know where every document is —{' '}
              <span className="relative sm:whitespace-nowrap">
                <span className="relative z-10">before someone asks</span>
                <span
                  className="absolute -bottom-1 left-0 h-2.5 w-full rounded-sm bg-primary/15"
                  aria-hidden
                />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
              CDTS routes memoranda, permits, and HR papers through your real approval chain — with
              QR public tracking, SLA alerts, and audit logs compliance teams can actually use.
            </p>
          </Reveal>

          {/* <Reveal delay={0.14}>
            <ul className="mt-8 space-y-2.5">
              {heroChecks.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/85">
                  <span className="h-px w-4 bg-primary/50" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal> */}

          {/* <Reveal delay={0.18}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/register">
                <Button size="lg" className="h-11 w-full px-6 sm:w-auto">
                  Start free trial
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <Link to="/track">
                <Button size="lg" variant="outline" className="h-11 w-full px-6 sm:w-auto">
                  Track DTS-2026-0000001
                </Button>
              </Link>
            </div>
          </Reveal> */}
        </div>

        <Reveal delay={0.12} y={28} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <motion.div
            className="relative"
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="absolute -inset-6 rounded-[1.75rem] bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-2xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Demo Municipality · Routing queue
                </div>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  3 overdue
                </span>
              </div>

              <div className="space-y-3 p-4">
                {[
                  {
                    id: 'DTS-2026-0000005',
                    title: 'Business permit renewal',
                    dept: 'Business Permits',
                    status: 'Pending approval',
                    tone: 'amber',
                  },
                  {
                    id: 'DTS-2026-0000003',
                    title: 'HR travel authority',
                    dept: 'City Administrator',
                    status: 'At Legal Review',
                    tone: 'blue',
                  },
                  {
                    id: 'DTS-2026-0000001',
                    title: 'Memorandum — budget realignment',
                    dept: 'Budget Office',
                    status: 'Completed',
                    tone: 'emerald',
                  },
                ].map((doc, index) => (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-border/70 bg-background/90 p-3.5 transition-premium hover:border-primary/25"
                    style={{ opacity: 1 - index * 0.08 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.title}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{doc.id}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          doc.tone === 'amber'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : doc.tone === 'emerald'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{doc.dept}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background">
                    <QrCode className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Public track portal</p>
                    <p className="text-[11px] text-muted-foreground">Anyone can scan · No login required</p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground sm:text-right">
                  cdts.io/track
                </span>
              </div>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  )
}
