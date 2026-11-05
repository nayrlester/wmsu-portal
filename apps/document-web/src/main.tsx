import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import { bootstrapApiLayer } from '@/app/bootstrap-api'
import { initSentry } from '@/lib/sentry'
import './index.css'

initSentry()
bootstrapApiLayer()

const stored = localStorage.getItem('cdts-theme')
if (stored) {
  try {
    const parsed = JSON.parse(stored)
    if (parsed.state?.theme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch {
    /* ignore */
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
