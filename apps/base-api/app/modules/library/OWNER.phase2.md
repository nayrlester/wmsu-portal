# library

- **SoR:** ULMIS catalog, circulation, patrons  
- **Schema:** `library`  
- **Phase 4 status:** **In-process on Base API** (`phase4-in-process`)
  - `/api/v1/library/_status` and `_health` via `ModuleStatusController`
  - `/api/v1/library/*` served from `app/modules/library`
- **Legacy façade:** `LibraryFacadeController` / `GATEWAY_LIBRARY_URL` — do not use for new work
- **Client shell:** `apps/library-web` (`:5183`)
- **Rule:** Other modules reference patron/item ids; they do not mutate catalog or circulation masters.
- **Phase 3b:** `wmsu_cis.library` restored (55 tables from `librastack.public`). Engine still SoR until search_path cutover.
- **Not yet:** search_path cutover; retiring `wmsu-library` folder.
