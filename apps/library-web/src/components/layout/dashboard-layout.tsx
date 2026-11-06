import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { UtilityPanel } from '@/components/layout/utility-panel'
import { BookFormModal } from '@/features/books/components/book-form-modal'
import { AiFab, FloatingAssistant } from '@/components/ai/floating-assistant'
import { useAuthStore } from '@/stores/auth-store'
import { isStudentLimitedAccess } from '@/lib/student-access'

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user)
  const [navOpen, setNavOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const studentLimited = isStudentLimitedAccess(user)
  const canUseAi = !studentLimited && user?.permissions.includes('ai:query')
  const canManageBooks =
    !studentLimited &&
    (user?.permissions.includes('books:create') || user?.permissions.includes('books:update'))

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        if (canUseAi) setAiOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canUseAi])

  return (
    <div className="flex min-h-screen bg-[var(--color-canvas)]">
      {navOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <AppSidebar mobileOpen={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <div className="flex flex-1 gap-6 px-4 pb-8 pt-4 sm:px-6">
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
          {!studentLimited && <UtilityPanel />}
        </div>
      </div>
      {canManageBooks && <BookFormModal />}
      {canUseAi && (
        <>
          {!aiOpen && <AiFab onClick={() => setAiOpen(true)} />}
          <FloatingAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
        </>
      )}
    </div>
  )
}
