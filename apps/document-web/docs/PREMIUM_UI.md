# Premium SaaS UI System

Design direction: **Linear · Stripe · Notion** — calm, neutral, enterprise-grade.

Reference: not a template clone. Intentionally minimal.

---

## Before → After

| Area | Before (DeskApp2 template) | After (Premium SaaS) |
|------|---------------------------|----------------------|
| Color | Purple gradients, dark sidebar | Neutral gray base, accent used sparingly |
| Sidebar | Bold purple active states | Light surface, subtle gray highlight |
| Dashboard | Gradient hero + loud stats | Metric tiles + quiet widgets |
| Tables | Gray header blocks | Stripe-style row hover, minimal borders |
| Badges | Saturated pill colors | Soft muted status rings |
| Typography | Mixed weights | Inter, tight tracking, clear scale |
| Motion | Template animations | 150ms transitions, page fade-in |

---

## Design tokens (`index.css`)

### Color
- **Background**: near-white `oklch(99%)`
- **Foreground**: near-black `oklch(18%)`
- **Border**: soft `oklch(91%)` at 80% opacity in components
- **Primary**: single slate-blue accent
- **Status**: `--color-success/warning/error/info` + muted variants

### Typography
| Token | Use |
|-------|-----|
| `.text-display` | Page titles (H1) |
| `.text-heading` | Widget titles (H2) |
| `.text-label` | Form labels |
| `.text-caption` | Meta, breadcrumbs |

### Spacing
8pt rhythm: `p-4` (16px), `p-5` (20px), `gap-4`, `gap-6`, `space-y-6`, `space-y-8`

### Elevation
- `--shadow-desk`: 1px subtle only
- `.surface-card`: border + minimal shadow (no heavy elevation)

### Motion
- `.transition-premium`: 150ms ease-out
- `.animate-page-in`: content fade-in
- `prefers-reduced-motion`: disables animations

---

## Component refactor plan

### ✅ Completed
- `index.css` — full token system
- `button`, `input`, `label` — minimal primitives
- `AppSidebar` — light, collapsible, icon-first
- `AppNavbar` — glass header, collapse toggle
- `MetricTile` — dashboard KPIs
- `WidgetCard` — section panels
- `ActivityFeed`, `RingChartCard` — refined
- `DataTable` / `TableHeader` — Linear-style rows
- `WorkflowStepper` — minimal nodes
- `DocumentStatusBadge` — soft pills
- `DocumentCard` — subtle hover
- `DashboardPage` — hierarchy-first layout
- `AuthLayout` — neutral split panel

### 🔜 Next pass (same tokens, no new patterns)
- `workflows-page`, `reports-page`, `document-detail`
- `FormModal` / `Dialog` overlay softness
- `admin/*` pages
- `onboarding` shell simplification

---

## Layout structure

```
AppLayout
├── AppSidebar (240px | 60px collapsed)
├── Column
│   ├── AppNavbar (56px, backdrop-blur)
│   └── main.animate-page-in
│       └── PageContainer (max-w 1400px)
│           ├── Title + description + primary action
│           └── ContentWrapper
```

---

## Usage

```tsx
import { PageContainer, MetricTile, WidgetCard } from '@/components/desk-app'

<PageContainer title="Documents" description="Track all records" breadcrumb="Documents">
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <MetricTile label="Total" value={128} loading={isLoading} />
  </div>
  <WidgetCard title="Recent" action={<Button variant="ghost" size="sm">View all</Button>}>
    {children}
  </WidgetCard>
</PageContainer>
```

---

## Strict rules (enforced)

- No rainbow UI or gradient heroes
- One primary action per screen
- Borders over shadows
- Accent color only for primary CTAs and current workflow step
- Mobile: existing `ResponsiveDataView` + bottom nav unchanged
