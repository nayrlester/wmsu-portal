# documents

- **SoR:** UDMS document metadata / workflows  
- **Schema:** `documents`  
- **Phase 2 status:** **Façade live on Base API**
  - `/api/v1/documents/_status`
  - `/api/v1/documents/_health`
  - `/api/v1/documents/*` → `wmsu-document` `/api/v1/*`
  - Gateway still: `/api/v1/gateway/documents/*`
- **Engine:** `GATEWAY_DOCUMENTS_URL` (default `http://127.0.0.1:3343`)
- **Client shell:** `apps/document-web` (`:5185`)
- **Rule:** Blobs in object storage; Postgres holds metadata and object keys. Other modules must not mutate document masters.
- **Phase 3b:** `wmsu_cis.documents` restored (66 tables metadata from `cdts.public`; blobs in object storage). Engine still SoR until search_path cutover.
- **Not yet:** search_path cutover; retiring `wmsu-document` folder.
