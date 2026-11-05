export const VERCEL_WEB_APPS = [
  { dir: 'apps/web-portal', filter: '@wmsu/web-portal', slug: 'cis-portal' },
  { dir: 'apps/admin-web', filter: '@wmsu/admin-web', slug: 'cis-admin' },
  { dir: 'apps/enrollment-web', filter: '@wmsu/enrollment-web', slug: 'cis-usis' },
  { dir: 'apps/records-web', filter: '@wmsu/records-web', slug: 'cis-torms' },
  { dir: 'apps/finance-web', filter: '@wmsu/finance-web', slug: 'cis-ufms' },
  { dir: 'apps/library-web', filter: '@wmsu/library-web', slug: 'cis-ulmis' },
  { dir: 'apps/library-opac-web', filter: '@wmsu/library-opac-web', slug: 'cis-opac' },
  { dir: 'apps/library-kiosk-web', filter: '@wmsu/library-kiosk-web', slug: 'cis-kiosk' },
  { dir: 'apps/inventory-web', filter: '@wmsu/inventory-web', slug: 'cis-uims' },
  { dir: 'apps/document-web', filter: '@wmsu/document-web', slug: 'cis-udms' },
]

export const RAILWAY_SERVICES = [
  {
    id: 'cis-base-api',
    config: 'deploy/railway/base-api.toml',
    repo: 'wmsu-platform',
    note: 'Base API + in-process modules',
  },
  {
    id: 'cis-worker',
    config: 'deploy/railway/worker.toml',
    repo: 'wmsu-platform',
    note: 'BullMQ worker',
  },
  {
    id: 'identity-api',
    config: 'railway.toml',
    repo: '../wmsu-api',
    note: 'University Identity (separate repo)',
  },
]
