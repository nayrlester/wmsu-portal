# documents

- **SoR:** UDMS document metadata / workflows (in-process)
- **Schema:** `documents`
- **Phase 4 status:** **In-process on Base API**
  - `/api/v1/documents/_status`
  - `/api/v1/documents/_health`
  - `/api/v1/documents/*` including `/api/v1/documents/udms/*`
- **Client shell:** `apps/document-web` (`:5185`)
- **Rule:** Blobs in object storage; Postgres holds metadata and object keys. Other modules must not mutate document masters.
- **Legacy:** `wmsu-document/` satellite — historical tests only; platform acceptance cites `pnpm test:documents` and `e2e/tests/udms/*`.
