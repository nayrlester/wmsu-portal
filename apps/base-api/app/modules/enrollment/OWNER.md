# enrollment

- **SoR:** domain module (in-process)
- **Schema:** `enrollment`
- **Phase 4 status:** **Absorbed into Base API**
  - Source copied from satellite into `app/modules/enrollment`
  - Public prefix: `/api/v1/enrollment/*`
  - Client: `apps/enrollment-web`
- **Rule:** Other modules must not write this schema's masters.
