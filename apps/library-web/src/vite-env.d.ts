/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME?: string
  readonly VITE_DEPLOYMENT_MODE?: 'university' | 'saas'
  readonly VITE_DEFAULT_TENANT_SLUG?: string
  readonly VITE_ALLOW_PUBLIC_REGISTER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
