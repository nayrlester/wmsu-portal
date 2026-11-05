import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpNotifyBootstrap, NotificationProvider } from '@wmsu/ui'
import { SearchPage } from '@/pages/search-page'
import { BookDetailPage } from '@/pages/book-detail-page'
import { QueueBoardPage } from '@/pages/queue-board-page'
import { SsoCallbackPage } from '@/pages/sso-callback-page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 429 || status === 401 || status === 403) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})

export function App() {
  return (
    <NotificationProvider>
      <HttpNotifyBootstrap />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        <Routes>
          <Route path="/sso/callback" element={<SsoCallbackPage />} />
          <Route path="/" element={<SearchPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/queue" element={<QueueBoardPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </NotificationProvider>
  )
}
