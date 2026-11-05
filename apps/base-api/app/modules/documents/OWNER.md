# documents

- **SoR:** domain module (in-process)
- **Schema:** `documents`
- **Phase 4 status:** **Absorbed into Base API**
  - Source copied from satellite into `app/modules/documents`
  - Public prefix: `/api/v1/documents/*`
  - Client: `apps/document-web`
- **Rule:** Other modules must not write this schema's masters.
