/** Mock payloads are allowed only when explicitly enabled for local development. */
export function allowDevMocks(): boolean {
  return import.meta.env.DEV === true && import.meta.env.VITE_USE_MOCK_DATA === 'true'
}

export function isProductionBuild(): boolean {
  return import.meta.env.PROD === true
}
