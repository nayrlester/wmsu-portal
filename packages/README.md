# WMSU CIS Platform — packages

| Package | Purpose |
|---------|---------|
| `@wmsu/config` | Shared env schema (Zod) |
| `@wmsu/types` | Shared TypeScript DTOs |
| `@wmsu/validation` | Shared Zod validators |
| `@wmsu/api-client` | Browser/server fetch client for platform API |
| `@wmsu/ui` | Design system (Tailwind + shadcn-style): layouts, tables, forms, dialogs |

Build order: `config` / `types` / `validation` → `api-client`.
