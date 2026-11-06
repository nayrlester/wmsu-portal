import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpNotifyBootstrap, NotificationProvider } from '@wmsu/ui'
import { SearchPage } from '@/pages/search-page'
import { BookDetailPage } from '@/pages/book-detail-page'
import { ReadingListsPage } from '@/pages/reading-lists-page'
import { LoansPage } from '@/pages/loans-page'
import { LibraryCardPage } from '@/pages/library-card-page'
import { RequestTitlePage } from '@/pages/request-title-page'
import { ElibraryPage } from '@/pages/elibrary-page'
import { ElibraryReaderPage } from '@/pages/elibrary-reader-page'
import { QueueBoardPage } from '@/pages/queue-board-page'
import { LocatorPage } from '@/pages/locator-page'
import { SsoCallbackPage } from '@/pages/sso-callback-page'
import { SsoLogoutPage } from '@/pages/sso-logout-page'

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
          <Route path="/sso/logout" element={<SsoLogoutPage />} />
          <Route path="/" element={<SearchPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/lists" element={<ReadingListsPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/card" element={<LibraryCardPage />} />
          <Route path="/request" element={<RequestTitlePage />} />
          <Route path="/elibrary" element={<ElibraryPage />} />
          <Route path="/elibrary/items/:id" element={<ElibraryReaderPage />} />
          <Route path="/queue" element={<QueueBoardPage />} />
          <Route path="/locate" element={<LocatorPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </NotificationProvider>
  )
}
