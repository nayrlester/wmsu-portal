# DeskApp Design System

Scalable React component library for CDTS SaaS dashboards, document tracking, and admin panels — styled after DeskApp2 with Tailwind + ShadCN primitives.

## Component Tree

```
components/desk-app/
├── index.ts                    # Public barrel
├── layout/
│   ├── app-layout.tsx          # Shell: sidebar + navbar + main
│   ├── app-sidebar.tsx         # Dark nav, badges, admin link
│   ├── app-navbar.tsx          # Org label, search/notif slots, profile
│   └── page-container.tsx      # PageContainer + ContentWrapper
├── dashboard/
│   ├── stat-card.tsx           # StatCard + WelcomeBanner
│   ├── chart-card.tsx          # Bar chart widget
│   ├── activity-feed.tsx       # List feed for approvals/activity
│   └── summary-widget.tsx      # Titled card with action slot
├── table/
│   ├── data-table.tsx          # Composed table (sort/filter/page/actions)
│   ├── table-header.tsx        # Sortable column headers
│   ├── table-filters.tsx       # Filter bar wrapper
│   ├── table-pagination.tsx    # Page controls
│   ├── table-row-actions.tsx   # Per-row action buttons
│   └── types.ts
├── forms/
│   ├── form-input.tsx          # RHF + Zod field
│   ├── form-select.tsx
│   ├── form-textarea.tsx
│   ├── form-date-picker.tsx
│   ├── form-file-upload.tsx
│   └── form-modal.tsx          # Dialog + form submit
├── documents/
│   ├── document-card.tsx
│   ├── document-status-badge.tsx
│   ├── document-timeline.tsx
│   └── document-preview-modal.tsx
├── workflow/
│   └── workflow-stepper.tsx    # Stepper + WorkflowNode + ApprovalChainViewer
└── notifications/
    ├── notification-bell.tsx
    ├── notification-dropdown.tsx
    └── notification-item.tsx

components/ui/                  # ShadCN primitives (Button, Input, Dialog…)
components/desk/                  # Smart wrappers (GlobalSearch, NotificationCenter)
components/layout/                # App shell wiring (DeskAppLayout)
```

## Architecture Rules

| Rule | Implementation |
|------|----------------|
| **No business logic in UI** | Components receive data via props; pages/hooks fetch API data |
| **Fully typed** | Every component exports `*Props` interfaces |
| **Composable** | Table = Header + Filters + Body + Pagination; Layout = slots |
| **Backward compatible** | Legacy paths re-export from `@/components/desk-app` |

## Layout Usage

```tsx
<AppLayout
  sidebar={<AppSidebar items={nav} brandName="Acme Corp" logoUrl={logo} />}
  navbar={
    <AppNavbar
      organizationLabel="Acme Corp"
      searchSlot={<GlobalSearch />}
      notificationSlot={<NotificationCenter />}
      user={{ displayName, roleLabel, initials }}
      onLogout={logout}
    />
  }
>
  {children}
</AppLayout>
```

## DataTable + StatCard Example

See `pages/dashboard-page.tsx` for production usage:

```tsx
<StatCard label="Total Documents" value={128} icon={FileText} accentClass="bg-blue-100 text-blue-600" />

<ChartCard
  title="Document volume"
  bars={[
    { label: 'Approved', value: 42, colorClass: 'bg-emerald-500' },
    { label: 'Pending', value: 18, colorClass: 'bg-amber-500' },
  ]}
/>

<DataTable
  columns={[
    { key: 'title', header: 'Title', sortable: true, render: (row) => row.title },
    { key: 'status', header: 'Status', render: (row) => <DocumentStatusBadge status={row.status} /> },
  ]}
  data={documents}
  keyExtractor={(row) => row.id}
  sort={sort}
  onSortChange={setSort}
  filters={[{ id: 'search', element: <Input … /> }]}
  filterSummary={`${total} records`}
  pagination={{ page: 1, pageSize: 20, total: 100 }}
  onPageChange={setPage}
  rowActions={(row) => [{ id: 'view', label: 'View', onClick: () => navigate(row.id) }]}
/>
```

## Form System (React Hook Form + Zod)

```tsx
const schema = z.object({ title: z.string().min(3), priority: z.enum(['low', 'normal', 'high']) })
const form = useForm({ resolver: zodResolver(schema) })

<FormInput name="title" control={form.control} label="Title" />
<FormSelect name="priority" control={form.control} label="Priority" options={priorityOptions} />
<FormFileUpload name="attachments" control={form.control} label="Attachments" />
```

## Design Tokens

DeskApp tokens live in `web/src/index.css`:

- `bg-sidebar`, `bg-sidebar-active`, `bg-sidebar-hover`
- `desk-card`, `desk-table-wrap`
- `bg-desk-header`
- Primary purple-blue accent via `--color-primary`

## Import Paths

```ts
import {
  AppLayout,
  StatCard,
  ChartCard,
  DataTable,
  FormInput,
  DocumentCard,
  WorkflowStepper,
  NotificationBell,
} from '@/components/desk-app'
```
