import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NotificationProvider } from '@wmsu/ui'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>
)
