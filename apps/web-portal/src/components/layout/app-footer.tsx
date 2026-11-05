import { Link } from 'react-router-dom'

const footerLinks = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/support', label: 'Support' },
] as const

export function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-[#dde1f5] bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 pr-20 sm:flex-row sm:px-6 sm:pr-24">
        <p className="text-xs text-[#9aa0c3]">
          © {year} University Platform Access Service
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Legal">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-[#6b6f8c] transition hover:text-[#635bff]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
