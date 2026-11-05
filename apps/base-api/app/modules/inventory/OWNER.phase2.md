# inventory

- **SoR:** UIMS property / stock  
- **Schema:** `inventory`  
- **Phase 2 status:** **Façade live on Base API**
  - `/api/v1/inventory/_status`
  - `/api/v1/inventory/_health`
  - `/api/v1/inventory/*` → `wmsu-inventory` `/api/v1/*`
  - Gateway still: `/api/v1/gateway/inventory/*`
- **Engine:** `GATEWAY_INVENTORY_URL` (default `http://127.0.0.1:3344`)
- **Client shell:** `apps/inventory-web` (`:5184`)
- **Rule:** May reference finance procurement ids; must not mutate finance rows. Other modules must not mutate asset/stock masters.
- **Phase 3b:** `wmsu_cis.inventory` structure present (36 tables via migrations absorb; no live row dump yet). Engine still SoR until search_path cutover.
- **Not yet:** Data re-dump from live UIMS; search_path cutover; retiring `wmsu-inventory` folder.
