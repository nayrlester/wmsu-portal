/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ULMIS_API_DOCS_URL?: string
  readonly VITE_HRIS_API_DOCS_URL?: string
  readonly VITE_DOCSTRACK_API_DOCS_URL?: string
  readonly VITE_UIMS_API_DOCS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
