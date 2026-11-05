import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { AppFooter } from '@/components/layout/app-footer'
import { AppHeader } from '@/components/layout/app-header'
import { fetchMe } from '@/lib/auth-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { resolvePlatformLaunchUrl, useLaunchPlatform } from '@/lib/platform-launch'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthPlatform } from '@/types/auth'
import clsx from 'clsx'
import {
  launcherPlatformLogos,
  launcherPlatformTones,
} from '@/features/legal/data/platform-branding'
import { LAUNCHER_INTRO } from '@/lib/campus-platforms'

const platformLogos = launcherPlatformLogos
const platformTones = launcherPlatformTones

function PlatformCard({ platform }: { platform: AuthPlatform }) {
  const launch = useLaunchPlatform()
  const logoUrl = platformLogos[platform.code]
  const tone = platformTones[platform.code] ?? 'bg-[#f3f4ff]'
  const disabled = !resolvePlatformLaunchUrl(platform)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => launch(platform)}
      className={clsx(
        'ui-card group flex w-full flex-col items-start gap-4 p-6 text-left transition',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(47,42,107,0.55)]'
      )}
    >
      <div
        className={clsx(
          'flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl',
          tone
        )}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
        ) : (
          <ExternalLink className="h-6 w-6 text-[#635bff]" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[#12122a]">{platform.name}</h3>
          {!disabled && (
            <ExternalLink className="h-4 w-4 text-[#6b6f8c] opacity-0 transition group-hover:opacity-100" />
          )}
        </div>
        {platform.description && (
          <p className="mt-1 text-sm text-[#6b6f8c]">{platform.description}</p>
        )}
        <p className="mt-3 text-xs font-medium text-[#9aa0c3]">
          {platform.requiresSso ? 'SSO launch' : 'Direct access'}
        </p>
      </div>
    </button>
  )
}

const HIDDEN_PLATFORM_CODES = new Set(['hris'])

export function LauncherPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const platforms = useAuthStore((s) => s.platforms).filter(
    (p) => !HIDDEN_PLATFORM_CODES.has(p.code)
  )
  const setProfile = useAuthStore((s) => s.setProfile)
  const logout = useAuthStore((s) => s.logout)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function refreshProfile() {
      try {
        const me = await fetchMe()
        if (!cancelled) {
          setProfile({
            user: me.user,
            roles: me.roles,
            platforms: me.platforms.filter((p) => !HIDDEN_PLATFORM_CODES.has(p.code)),
          })
          setError(null)
        }
      } catch (err) {
        if (cancelled) return
        // Stale/expired Identity session — clear and force login so SSO does not launch dead tokens.
        logout()
        navigate('/login', { replace: true, state: { reason: getApiErrorMessage(err) } })
        return
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void refreshProfile()
    return () => {
      cancelled = true
    }
  }, [setProfile, logout, navigate])

  return (
    <div className="flex min-h-screen flex-col bg-[#e6e9ff]">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="animate-fade-up mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#12122a]">
            Welcome{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-2 text-sm text-[#6b6f8c]">{LAUNCHER_INTRO}</p>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ui-card h-44 animate-pulse bg-white/60" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {!loading && !error && platforms.length === 0 && (
          <div className="ui-card px-6 py-12 text-center">
            <p className="text-lg font-medium text-[#12122a]">No platforms assigned</p>
            <p className="mt-2 text-sm text-[#6b6f8c]">
              Contact your identity administrator to request access.
            </p>
          </div>
        )}

        {!loading && platforms.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform, index) => (
              <div
                key={platform.code}
                className={clsx(
                  'animate-fade-up',
                  index === 1 && 'animate-fade-up-delay-1',
                  index === 2 && 'animate-fade-up-delay-2'
                )}
              >
                <PlatformCard platform={platform} />
              </div>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  )
}
