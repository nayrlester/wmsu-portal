import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NotificationProvider } from '@wmsu/ui'
import './index.css'
import { App } from './app/app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>
)
