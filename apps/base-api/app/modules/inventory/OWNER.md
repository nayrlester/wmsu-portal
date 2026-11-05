# inventory

- **SoR:** domain module (in-process)
- **Schema:** `inventory`
- **Phase 4 status:** **Absorbed into Base API**
  - Source copied from satellite into `app/modules/inventory`
  - Public prefix: `/api/v1/inventory/*`
  - Client: `apps/inventory-web`
- **Rule:** Other modules must not write this schema's masters.
