# Base API domain modules

Each folder is a **bounded context**. Controllers, services, models, validators, middleware, routes, and tests live here.

| Module | TOR system | Schema | Runtime |
|--------|------------|--------|---------|
| `common-platform` | CMN / Identity | `common` | Identity still façades to `wmsu-api`; audit/integrations/events folders present |
| `enrollment` | USiS | `enrollment` | **In-process** (`/api/v1/enrollment/*`) |
| `records` | TORMS | `records` | **In-process** (`/api/v1/records/*`) |
| `finance` | UFMS | `finance` | **In-process** (`/api/v1/finance/*`) |
| `library` | ULMIS | `library` | **In-process** (`/api/v1/library/*`) |
| `inventory` | UIMS | `inventory` | **In-process** (`/api/v1/inventory/*`) |
| `documents` | UDMS | `documents` | **In-process** (`/api/v1/documents/*`) |

Phase 4 absorb: domain engines were copied from satellite monorepos into these modules and registered from `start/routes.ts`. Clients live under `apps/*-web` and call Base API `:3500`.
