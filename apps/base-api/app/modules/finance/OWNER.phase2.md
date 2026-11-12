# finance

- **SoR:** UFMS financial / cashiering / procurement  
- **Schema:** `finance`  
- **Phase 4 status:** **In-process on Base API (port 3500)**
  - `/api/v1/finance/*` served by `app/modules/finance` (not satellite proxy)
  - Finance web: `apps/finance-web` (**5182**)
- **Legacy:** `wmsu-finance` / **3342** — do not use for new deploy or acceptance evidence
- **Rule:** Other modules reference OR/assessment ids; they do not post journals or mutate finance masters.
