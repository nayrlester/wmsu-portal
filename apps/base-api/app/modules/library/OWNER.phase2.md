# library

- **SoR:** ULMIS catalog, circulation, patrons  
- **Schema:** `library`  
- **Phase 2 status:** **Façade live on Base API**
  - `/api/v1/library/_status`
  - `/api/v1/library/_health`
  - `/api/v1/library/*` → `wmsu-library` `/api/v1/*`
  - Gateway still: `/api/v1/gateway/library/*`
- **Engine:** `GATEWAY_LIBRARY_URL` (default `http://127.0.0.1:3341`)
- **Client shell:** `apps/library-web` (`:5183`)
- **Rule:** Other modules reference patron/item ids; they do not mutate catalog or circulation masters.
- **Phase 3b:** `wmsu_cis.library` restored (55 tables from `librastack.public`). Engine still SoR until search_path cutover.
- **Not yet:** search_path cutover; retiring `wmsu-library` folder.
