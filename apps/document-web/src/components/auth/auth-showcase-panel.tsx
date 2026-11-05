import { useLocation } from 'react-router-dom'
import { FileText, Shield, Workflow, Zap } from 'lucide-react'
import { APP_BRAND_FULL_NAME } from '@/shared/constants/branding'

const features = [
  { icon: FileText, text: 'Tracking numbers and audit history on every document' },
  { icon: Workflow, text: 'Configurable approval steps per document type' },
  { icon: Shield, text: 'Permissions by role — admin, approver, member, user' },
] as const

export function AuthShowcasePanel() {
  const isRegister = useLocation().pathname === '/register'

  return (
    <aside
      className="login-wave wmsu-login-hero relative hidden min-h-[520px] flex-col p-10 text-white lg:flex"
      aria-label="Product overview"
    >
      <div className="absolute inset-0 login-wave" />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <p className="max-w-xs text-2xl font-semibold leading-snug text-white">
            {isRegister
              ? 'Create your organization workspace.'
              : 'Quiet tools for busy university document routing.'}
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/75">{APP_BRAND_FULL_NAME}</p>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -right-2 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg">
            <Zap className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden />
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
            <div className="rounded-[1.25rem] wmsu-auth-inner-panel p-5">
              <ul className="space-y-3">
                {features.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-sm leading-snug text-white/90">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm font-medium text-white/90">Route · Approve · Archive</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/65">WMSU · UDMS</p>
      </div>
    </aside>
  )
}
