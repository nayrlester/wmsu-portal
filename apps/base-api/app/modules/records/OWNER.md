# records

- **SoR:** domain module (in-process)
- **Schema:** `records`
- **Phase 4 status:** **Absorbed into Base API**
  - Source copied from satellite into `app/modules/records`
  - Public prefix: `/api/v1/records/*`
  - Client: `apps/records-web`
- **Rule:** Other modules must not write this schema's masters.
