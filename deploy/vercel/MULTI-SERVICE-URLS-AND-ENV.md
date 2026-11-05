# Vercel Services (one project, many web apps)

You deployed all `*-web` apps as **Services** in a **single** Vercel project (e.g. `wmsu-portal`).

## 1. Find your URLs

### Production domain (always)

1. Vercel → your project → **Settings** → **Domains**
2. Production URL looks like: `https://wmsu-portal.vercel.app` (or your custom domain)

That is **one hostname** for the whole deployment.

### Which app opens on which URL?

Services are **internal until a rewrite exposes them**. Root [`vercel.json`](../../vercel.json) routes **`/(.*)` → `web-portal`**, so the project production domain (e.g. `https://wmsu-portal.vercel.app/`) serves the unified launcher. **Redeploy** after changing `vercel.json`.

Other campus SPAs in the same project are built but not on `/` unless you add path rewrites and matching Vite `base` — **one Vercel project per `apps/*-web`** remains easiest ([IMPORT.md](IMPORT.md)).

**Preview URLs:** each git branch deploy gets `https://<project>-<hash>.vercel.app` (same routing rules as production for that deploy).

### Quick test

Open your production domain in the browser. Note the path. For USIS at prefix `/enrollment`, try:

`https://<your-domain>/enrollment/`

(Exact prefixes depend on your Vercel Services routing config in the dashboard or `vercel.json`.)

---

## 2. Add environment variables

### Where

Vercel → project → **Settings** → **Environment Variables**

Choose **Production** (and **Preview** if you use branch deploys). **Redeploy** after changes (`VITE_*` are baked in at build time).

### Shared project = shared variables

All services in one project use the **same** variable set for each environment. You **cannot** set different `VITE_API_URL` per service in the UI unless you use **different variable names** per app (not how the apps are written today).

**Railway Base API (use everywhere):**

```text
https://wmsubase-api-production.up.railway.app
```

### Option A — Recommended: split into 10 Vercel projects

Root Directory `apps/web-portal`, `apps/enrollment-web`, etc. Each project gets its **own URL** and **own** env:

| Project root | Key variables |
|--------------|----------------|
| `apps/web-portal` | `VITE_API_URL=https://wmsubase-api-production.up.railway.app` |
| `apps/enrollment-web` | `VITE_API_URL=…/api/v1/enrollment`, `VITE_PLATFORM_IDENTITY_URL=https://wmsubase-api-production.up.railway.app` |
| `apps/records-web` | `VITE_API_URL=…/api/v1/records` |
| `apps/finance-web` | `VITE_API_URL=…/api/v1/finance` |
| `apps/inventory-web` | `VITE_API_URL=…/api/v1/inventory` |
| `apps/document-web` | `VITE_API_URL=…/api/v1/documents` |
| `apps/library-web`, opac, kiosk | `VITE_API_URL=…/api/v1/library` |
| `apps/admin-web` | `VITE_API_BASE_URL=https://wmsubase-api-production.up.railway.app` |

Full list: [`../env/web.vercel.env.example`](../env/web.vercel.env.example).

Each project’s URL = **Settings → Domains** on **that** project.

### Option B — Keep one multi-service project

1. **API:** Set one project variable used by all builds (portal-style):

   `VITE_API_URL=https://wmsubase-api-production.up.railway.app`

   Module apps (USIS, TORMS, …) also need the **module suffix** in `VITE_API_URL`; a single shared value is **wrong** for enrollment unless you add path-based routing + proxy (advanced).

2. **Better for one project:** Add a top-level **rewrite** in `vercel.json` to proxy API to Railway:

   ```json
   "rewrites": [
     {
       "source": "/api/:path*",
       "destination": "https://wmsubase-api-production.up.railway.app/api/:path*"
     }
   ]
   ```

   Then leave module apps’ `VITE_API_URL` unset so they use relative paths (`/api/v1/enrollment`, etc.) on **the same** Vercel origin. Portal still needs `VITE_API_URL` empty or the same origin for `/api/v1`.

3. **Expose each SPA** with path rewrites to each service (and set each Vite app `base` to match). That requires extra `vercel.json` + Vite `base` work per app.

---

## 3. Railway / Identity (after you know Vercel URLs)

On **Railway → cis-base-api**:

```env
CORS_ORIGINS=https://wmsu-portal.vercel.app,https://your-usis-url,...
APP_URL=https://wmsubase-api-production.up.railway.app
```

Use every **public** frontend URL (comma-separated, no trailing slash).

On **Identity** (`wmsu-api`): set `*_WEB_URL` and `CORS_ORIGIN` to match each live Vercel URL.

---

## 4. Summary

| Question | Answer |
|----------|--------|
| Where is my URL? | Project **Settings → Domains** (+ service path if multi-service) |
| Where is env? | Project **Settings → Environment Variables** → redeploy |
| Different API path per app? | **Separate Vercel projects** (easiest) or API **rewrite** + relative `VITE_API_URL` on one domain |

See also [IMPORT.md](IMPORT.md) and [README.md](README.md).
