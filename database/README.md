# Database folder

Lucid migrations, seeders, and factories live under `apps/api/database/` (AdonisJS ESM loader requirement).

On Windows/dev machines, this `database/` directory uses **directory junctions** so the approved monorepo layout remains:

```text
database/migrations  →  apps/api/database/migrations
database/seeders     →  apps/api/database/seeders
database/factories   →  apps/api/database/factories
```

Run migrations from the monorepo root:

```bash
pnpm run db:migrate
pnpm run db:seed
```
