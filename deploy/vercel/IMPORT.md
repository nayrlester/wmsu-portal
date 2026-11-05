# Import on Vercel (avoid API + worker)

**`apps/base-api` and `apps/worker` run on Railway only.** Do not deploy them on Vercel.

## Recommended: one Vercel project per SPA

Do **not** import the repo with Root Directory `./` and preset **Services** unless you know you want a single multi-service deployment.

For **wmsu-portal** (launcher only):

1. Vercel → **Add New** → **Project** → your `wmsu-platform` GitHub repo.
2. Click **Edit** next to Root Directory.
3. Set Root Directory to **`apps/web-portal`** (not `./`).
4. Framework: **Vite** (auto from `apps/web-portal/vercel.json`).
5. Deploy.

Repeat for each client (`apps/enrollment-web`, `apps/records-web`, …). See [README.md](README.md) for the full table.

On the multi-service detection screen, use **Import single project** on **`web-portal`** only — do not import `base-api` or `worker`.

## Root `vercel.json` (optional)

The repo root [`vercel.json`](../../vercel.json) lists **only the 10 Vite apps** in a `services` block. It intentionally **excludes** `base-api` and `worker`.

**Production domain:** root `vercel.json` includes a catch-all rewrite to the **`web-portal`** service so `https://<project>.vercel.app/` serves the launcher. Redeploy after pulling that change. Module apps (USIS, UFMS, …) still need **separate Vercel projects** or path + Vite `base` work — see [MULTI-SERVICE-URLS-AND-ENV.md](MULTI-SERVICE-URLS-AND-ENV.md).

## If Vercel still shows Container services

- **Cancel** the import.
- Change Root Directory to a single app path (`apps/web-portal`).
- Or remove `base-api` / `worker` from the staged Services list before deploy.

Railway docs: [`../railway/README.md`](../railway/README.md).
