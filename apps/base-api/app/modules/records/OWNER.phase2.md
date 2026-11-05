# records

- **SoR:** TORMS requests, issuance, alumni profiles  
- **Schema:** `records`  
- **Phase 2 status:** **Façade live on Base API**
  - `/api/v1/records/_status`
  - `/api/v1/records/_health`
  - `/api/v1/records/*` → `wmsu-records` `/api/v1/*`
  - Gateway still: `/api/v1/gateway/records/*`
- **Engine:** `GATEWAY_RECORDS_URL` (default `http://127.0.0.1:3345`)
- **Client shell:** `apps/records-web` (`:5181`)
- **Rule:** Academic grades remain USiS-owned; TORMS stores ledger projections and issuance SoR only.
- **Not yet:** Physical move of TORMS tables into schema `records` (Phase 3); retiring `wmsu-records` folder.
