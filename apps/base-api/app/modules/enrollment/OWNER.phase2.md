# enrollment

- **SoR:** USiS student academic records  
- **Schema:** `enrollment`  
- **Phase 2 status:** **Façade live on Base API**
  - `/api/v1/enrollment/_status`
  - `/api/v1/enrollment/_health`
  - `/api/v1/enrollment/*` → `wmsu-enrollment` `/api/v1/*`
  - Gateway still: `/api/v1/gateway/enrollment/*`
- **Engine:** `GATEWAY_ENROLLMENT_URL` (default `http://127.0.0.1:3340`)
- **Client shell:** `apps/enrollment-web` (`:5180`)
- **Rule:** Other modules reference student numbers/ids; they do not write enrollment masters.
- **Phase 3b:** `wmsu_cis.enrollment` restored (114 tables).
- **Phase 3c:** Engine `.env` cut over to `wmsu_cis` / `DB_SCHEMA=enrollment` (rollback via `.env.pre-cis`).
- **Not yet:** retiring `wmsu-enrollment` folder (Phase 4).
