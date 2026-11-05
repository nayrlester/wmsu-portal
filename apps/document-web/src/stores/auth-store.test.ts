import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore, useThemeStore } from '@/stores/auth-store'

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      user: null,
      tokens: null,
      permissions: [],
      permissionsReady: false,
      permissionsStatus: 'idle',
      isAuthenticated: false,
    })
  })

  it('setAuth stores user, tokens, and localStorage', () => {
    const user = {
      id: '1',
      email: 'owner@gmail.com',
      fullName: 'Demo Owner',
      isSuperAdmin: false,
      tenantId: 'tenant-1',
    }
    const tokens = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600, tokenType: 'Bearer' as const }

    useAuthStore.getState().setAuth(user, tokens)

    useAuthStore.getState().setPermissions(['documents.view', 'users.manage'])
    useAuthStore.getState().setAuth(user, tokens)

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().permissions).toEqual([])
    expect(useAuthStore.getState().permissionsReady).toBe(false)
    expect(useAuthStore.getState().user?.email).toBe('owner@gmail.com')
    expect(localStorage.getItem('accessToken')).toBe('access')
    expect(localStorage.getItem('refreshToken')).toBe('refresh')
  })

  it('does not persist permissions across rehydrate', () => {
    useAuthStore.getState().setAuth(
      {
        id: '1',
        email: 'owner@gmail.com',
        fullName: 'Demo',
        isSuperAdmin: false,
        tenantId: 't1',
      },
      { accessToken: 'a', refreshToken: 'r', expiresIn: 3600, tokenType: 'Bearer' as const }
    )
    useAuthStore.getState().setPermissions(['documents.view', 'settings.manage'])

    const persisted = JSON.parse(localStorage.getItem('cdts-auth') ?? '{}')
    expect(persisted.state?.permissions).toBeUndefined()
  })

  it('logout clears session and tokens', () => {
    useAuthStore.getState().setAuth(
      {
        id: '1',
        email: 'owner@gmail.com',
        fullName: 'Demo',
        isSuperAdmin: false,
        tenantId: 't1',
      },
      { accessToken: 'a', refreshToken: 'r', expiresIn: 3600, tokenType: 'Bearer' as const }
    )

    useAuthStore.getState().logout()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('setUser updates user without touching tokens', () => {
    useAuthStore.getState().setUser({
      id: '2',
      email: 'updated@test.com',
      fullName: 'Updated',
      isSuperAdmin: false,
      tenantId: 't1',
    })

    expect(useAuthStore.getState().user?.email).toBe('updated@test.com')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    useThemeStore.setState({ theme: 'light' })
  })

  it('toggle switches between light and dark', () => {
    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    useThemeStore.getState().toggle()
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('setTheme applies explicit theme', () => {
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
