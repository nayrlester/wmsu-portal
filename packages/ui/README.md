# @wmsu/ui — Shared UI foundation

Enterprise design system for WMSU Campus Information Systems (USiS, ULMIS, UFMS, UDMS, UIMS, TORMS + platform admin).

Built with **React 19**, **Tailwind CSS v4**, and **shadcn/ui-style** primitives (Radix + CVA).

## Install / consume

```tsx
import '@wmsu/ui/styles.css'
import { AppShell, PageLayout, DataTable, Button } from '@wmsu/ui'
```

Apps must enable Tailwind with `@tailwindcss/vite` and import `@wmsu/ui/styles.css` (includes `@source` scanning for package components).

## Layout

| Component | Usage |
|-----------|--------|
| `AppShell` | Application chrome: sidebar + header + responsive mobile drawer |
| `AppSidebar` | Primary navigation (`NavItem[]`) |
| `AppHeader` | Top bar, menu toggle, actions, user menu |
| `UserMenu` | Profile dropdown (Radix) |
| `Breadcrumb` | Hierarchical location |
| `PageHeader` / `PageLayout` | Consistent page title, actions, content width |

## Data display

| Component | Usage |
|-----------|--------|
| `DashboardCard` | KPI / summary metric |
| `DataTable` | Accessible table with loading + empty states |
| `Pagination` | Previous / next paging |
| `Badge` / `StatusBadge` | Status chips |
| `EmptyState` / `LoadingState` / `Skeleton` | Async UI states |

## Forms & filters

| Component | Usage |
|-----------|--------|
| `FormField` | Label + description + error wiring |
| `Input` / `Textarea` / `Select` / `Checkbox` | Controls with `invalid` support |
| `SearchInput` | Search field with clear |
| `FilterPanel` | Filter toolbar card |
| `FileUpload` | Drag-and-drop + file list |

## Feedback

| Component | Usage |
|-----------|--------|
| `Alert` / `NotificationBanner` | Inline alerts |
| `NotificationProvider` + `useNotification` | Toast-style notifications |
| `Modal` / `Dialog*` | General dialogs |
| `ConfirmDialog` | Destructive / confirm flows |
| `Button` | Primary actions |

## Example

```tsx
<AppShell
  sidebar={{ items: [{ id: 'home', label: 'Home', active: true }] }}
  header={{ title: 'USiS', user: { name: 'Registrar', onSignOut: () => {} } }}
>
  <PageLayout header={{ title: 'Students', breadcrumbs: [{ label: 'USiS' }, { label: 'Students', current: true }] }}>
    <DataTable columns={...} data={...} keyExtractor={(r) => r.id} />
  </PageLayout>
</AppShell>
```

Showcase: `apps/admin-portal` (http://127.0.0.1:5174).

Full catalog: [`docs/UI_DESIGN_SYSTEM.md`](../../../docs/UI_DESIGN_SYSTEM.md).
