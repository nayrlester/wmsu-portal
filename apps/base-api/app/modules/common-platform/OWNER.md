# common-platform

- **SoR (target):** Identity, RBAC, organizations, launcher, clearance aggregation, CIS MDM  
- **Schema:** `common` (+ `audit`)  
- **Phase 1 status:** **Identity façade live on Base API**
  - `/.well-known/jwks.json`
  - `/api/v1/auth/*`
  - `/api/v1/admin/*`
  - `/api/v1/integrations/*`
  - `/api/v1/platform/status`
  - `/api/v1/platform/launcher`
- **Engine:** Still `wmsu-api` (`GATEWAY_IDENTITY_URL`, default `http://127.0.0.1:3411`)
- **Satellites:** Set `PLATFORM_IDENTITY_URL` / JWKS to Base API `:3500`
- **Phase 3b:** `wmsu_cis.common` restored (12 tables from `librastack.wmsu_identity`).
- **Phase 3c:** Engine `.env` cut over to `wmsu_cis` / `DB_SCHEMA=common` (rollback via `.env.pre-cis`).
- **Not yet:** retiring `wmsu-api` identity engine folder (Phase 4)
