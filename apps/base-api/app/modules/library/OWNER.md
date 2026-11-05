# library

- **SoR:** domain module (in-process)
- **Schema:** `library`
- **Phase 4 status:** **Absorbed into Base API**
  - Source copied from satellite into `app/modules/library`
  - Public prefix: `/api/v1/library/*`
  - Client: `apps/library-web`
- **Rule:** Other modules must not write this schema's masters.
