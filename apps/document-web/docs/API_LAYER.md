# API Layer — Production SaaS HTTP Client

Axios-based API service layer with TypeScript, multi-tenant headers, auth refresh, standardized errors, and React Query compatibility.

## Structure

```
web/src/api/
├── client.ts                 # Axios instance + interceptor registration
├── config.ts                 # baseURL, timeout, retry, auth paths
├── index.ts                  # Public barrel exports
├── types/
│   └── api-error.types.ts
├── errors/
│   └── api-error.ts          # ApiError class + normalizeAxiosError()
├── lib/
│   ├── tenant-context.ts     # X-Tenant-Id resolver (no store coupling)
│   ├── session-manager.ts    # Logout handler registration
│   └── refresh-token-manager.ts  # Queued token refresh
├── utils/
│   └── request.ts            # apiRequest() — unwraps response.data
├── interceptors/
│   ├── auth.interceptor.ts   # Bearer JWT injection
│   ├── tenant.interceptor.ts # X-Tenant-Id header
│   ├── retry.interceptor.ts  # GET retry on 5xx/network
│   └── error.interceptor.ts  # 401 refresh + ApiError normalization
└── modules/
    ├── auth.api.ts
    ├── documents.api.ts
    ├── workflows.api.ts
    ├── approvals.api.ts
    ├── notifications.api.ts
    ├── admin.api.ts
    └── platform.api.ts       # settings, billing, dashboard, roles
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `''` | API host (e.g. `http://localhost:3333`) |
| `VITE_API_TIMEOUT_MS` | `30000` | Request timeout |
| `VITE_API_RETRY_COUNT` | `2` | Max retries for idempotent GET requests |
| `VITE_API_RETRY_DELAY_MS` | `500` | Base delay between retries |

## Request Pipeline

```
Request
  → auth interceptor    (Authorization: Bearer …)
  → tenant interceptor  (X-Tenant-Id: …)
  → axios transport
  → retry interceptor   (GET 5xx / network only)
  → error interceptor   (401 refresh → retry OR ApiError)
  → apiRequest()        (returns typed data)
```

## Multi-Tenant

Backend resolves tenant from JWT `user.tenantId`. Super admins can override via `X-Tenant-Id` header.

Frontend injects tenant automatically:

```ts
// app/bootstrap-api.ts (called in main.tsx)
tenantContext.registerResolver(() => {
  const user = useAuthStore.getState().user
  if (user?.tenantId) return user.tenantId
  return useTenantStore.getState().organization?.id ?? null
})

// Super-admin impersonation
tenantContext.setImpersonatedTenantId('tenant-uuid')
```

## Error Handling

All failed requests reject with `ApiError`:

```ts
import { ApiError } from '@/api'

try {
  await authApi.login(email, password)
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isValidation()) {
      error.validationErrors.forEach(({ field, message }) => …)
    }
    if (error.isUnauthorized()) { … }
    if (error.isForbidden()) { … }
    if (error.isServerError()) { … }
  }
}
```

| HTTP | ApiError.code | UI use |
|------|---------------|--------|
| 400/422 | `VALIDATION_ERROR` | Form field errors |
| 401 | `UNAUTHORIZED` | Redirect to login |
| 403 | `FORBIDDEN` | Permission denied toast |
| 404 | `NOT_FOUND` | Empty / not found state |
| 500+ | `SERVER_ERROR` | Generic error + retry |
| Network | `NETWORK_ERROR` | Offline banner |
| Timeout | `TIMEOUT` | Retry prompt |

## React Query Integration

All module methods return `Promise<T>` (not `AxiosResponse`):

```ts
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.documents, filters],
    queryFn: () => documentsApi.list(filters),
  })
}

export function useApproveDocument(documentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ApprovalActionInput) => approvalsApi.act(documentId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.documents] }),
  })
}
```

## Scaling Best Practices

1. **One module per domain** — Add `api/modules/billing.api.ts`, export from `api/index.ts`.
2. **Feature services wrap API** — `features/documents/services/` maps API shapes to domain types.
3. **Never import stores from interceptors** — Use `tenantContext.registerResolver()` at bootstrap.
4. **Use `skipAuth` / `skipTenant`** on public routes (`login`, `register`, public track).
5. **Query keys in `shared/constants/env.ts`** — Keep cache invalidation predictable.
6. **Throw `ApiError` in UI boundaries** — Login/forms read `validationErrors`; global handler catches 500s.

## Module Examples

```ts
// auth.api.ts
authApi.login(email, password)           // → Promise<LoginResponse>
authApi.profile()                        // → Promise<AuthProfile>

// documents.api.ts
documentsApi.list({ status: 'draft' })   // → Promise<PaginatedResponse<DocumentRecord>>
documentsApi.submit(id)                  // → Promise<void>

// approvals.api.ts
approvalsApi.listPending()               // → Promise<PaginatedResponse<DocumentRecord>>
approvalsApi.act(documentId, { action: 'approve' })

// workflows.api.ts
workflowsApi.list({ limit: 50 })         // → Promise<{ workflows, meta }>
workflowsApi.publish(id)                 // → Promise<void>

// notifications.api.ts
notificationsApi.unreadCount()           // → Promise<{ unreadCount: number }>
notificationsApi.markAllRead()           // → Promise<void>

// admin.api.ts
adminApi.analyticsOverview()             // → Promise<{ overview: PlatformOverview }>
adminApi.suspendTenant(id)               // → Promise<void>
```
