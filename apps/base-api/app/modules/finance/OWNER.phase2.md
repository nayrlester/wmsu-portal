# finance

- **SoR:** UFMS financial / cashiering / procurement  
- **Schema:** `finance`  
- **Phase 2 status:** **Façade live on Base API**
  - `/api/v1/finance/_status`
  - `/api/v1/finance/_health`
  - `/api/v1/finance/*` → `wmsu-finance` `/api/v1/*`
  - Gateway still: `/api/v1/gateway/finance/*`
- **Engine:** `GATEWAY_FINANCE_URL` (default `http://127.0.0.1:3342`)
- **Client shell:** `apps/finance-web` (`:5182`)
- **Rule:** Other modules reference OR/assessment ids; they do not post journals or mutate finance masters.
- **Not yet:** Physical move of UFMS tables into schema `finance` (Phase 3); retiring `wmsu-finance` folder.
