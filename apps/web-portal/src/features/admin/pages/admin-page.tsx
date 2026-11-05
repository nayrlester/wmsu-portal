import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { AppFooter } from '@/components/layout/app-footer'
import { AppHeader } from '@/components/layout/app-header'
import { createUser, listPlatforms, listRoles, listUsers, updateUser } from '@/lib/admin-api'
import { getApiErrorMessage } from '@/lib/api-client'
import type { AdminPlatform, AdminRole, AdminUser, CreateUserPayload } from '@/types/admin'
import clsx from 'clsx'

const STUDENT_PLATFORMS = new Set(['library', 'library_opac', 'library_kiosk'])

const ROLE_ACCESS_NOTES: Record<string, string> = {
  student:
    'USiS student portal only; ULMIS member/OPAC/kiosk; TORMS self-service requests. No registrar or staff modules.',
  employee:
    'Platform launch only unless another role is assigned. ULMIS staff when library.* is granted; UDMS view/download when docstrack is granted.',
  registrar:
    'USiS registrar workflows; ULMIS staff; limited UFMS reads when Finance platform is assigned.',
  adviser: 'USiS faculty/advising and grade encoding; not full registrar.',
  cashier: 'UFMS cashiering, POS, and payment reads; not full procurement admin.',
  records_officer: 'TORMS registrar staff pack; minimal USiS reads when Enrollment is assigned.',
  identity_admin: 'Full access across all assigned platforms.',
}

type UserFormState = {
  email: string
  fullName: string
  password: string
  status: 'active' | 'disabled'
  roleCodes: string[]
  platformCodes: string[]
}

const emptyForm: UserFormState = {
  email: '',
  fullName: '',
  password: '',
  status: 'active',
  roleCodes: [],
  platformCodes: [],
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { code: string; name: string }[]
  selected: string[]
  onChange: (codes: string[]) => void
}) {
  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code])
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-[#12122a]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt.code}
            className={clsx(
              'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition',
              selected.includes(opt.code)
                ? 'bg-[#635bff] text-white'
                : 'bg-[#f3f4ff] text-[#6b6f8c] hover:bg-[#e6e9ff]'
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selected.includes(opt.code)}
              onChange={() => toggle(opt.code)}
            />
            {opt.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function UserModal({
  mode,
  user,
  roles,
  platforms,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  user: AdminUser | null
  roles: AdminRole[]
  platforms: AdminPlatform[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<UserFormState>(() =>
    user
      ? {
          email: user.email,
          fullName: user.fullName,
          password: '',
          status: user.status,
          roleCodes: user.roles,
          platformCodes: user.platforms,
        }
      : emptyForm
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isStudent = form.roleCodes.includes('student')
  const platformOptions = isStudent
    ? platforms.filter((p) => STUDENT_PLATFORMS.has(p.code))
    : platforms

  function setRoleCodes(roleCodes: string[]) {
    const nextStudent = roleCodes.includes('student')
    setForm((f) => ({
      ...f,
      roleCodes,
      platformCodes: nextStudent
        ? f.platformCodes.filter((c) => STUDENT_PLATFORMS.has(c)).length
          ? f.platformCodes.filter((c) => STUDENT_PLATFORMS.has(c))
          : ['library', 'library_opac', 'library_kiosk']
        : f.platformCodes,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      if (mode === 'create') {
        const payload: CreateUserPayload = {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          password: form.password,
          roleCodes: form.roleCodes,
          platformCodes: form.platformCodes,
        }
        await createUser(payload)
      } else if (user) {
        const payload: Record<string, unknown> = {
          fullName: form.fullName.trim(),
          status: form.status,
          roleCodes: form.roleCodes,
          platformCodes: form.platformCodes,
        }
        if (form.password) payload.password = form.password
        await updateUser(user.id, payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12122a]/40 p-4 backdrop-blur-sm">
      <div className="ui-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#12122a]">
            {mode === 'create' ? 'Create user' : 'Edit user'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6b6f8c] hover:bg-[#f3f4ff]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'create' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#12122a]">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-11 w-full rounded-full bg-[#f3f4ff] px-4 text-sm text-[#12122a] outline-none ring-[#635bff]/30 focus:ring-2"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#12122a]">Full name</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="h-11 w-full rounded-full bg-[#f3f4ff] px-4 text-sm text-[#12122a] outline-none ring-[#635bff]/30 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#12122a]">
              {mode === 'create' ? 'Password' : 'New password (optional)'}
            </label>
            <input
              type="password"
              required={mode === 'create'}
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="h-11 w-full rounded-full bg-[#f3f4ff] px-4 text-sm text-[#12122a] outline-none ring-[#635bff]/30 focus:ring-2"
            />
          </div>

          {mode === 'edit' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#12122a]">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as 'active' | 'disabled' }))
                }
                className="h-11 w-full rounded-full bg-[#f3f4ff] px-4 text-sm text-[#12122a] outline-none ring-[#635bff]/30 focus:ring-2"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          )}

          {isStudent && (
            <p className="rounded-2xl bg-[#f3f4ff] px-4 py-3 text-xs text-[#6b6f8c]">
              Students can access Library portal, OPAC, and Kiosk. HRIS, UDMS, and UIMS are
              blocked. Prefer provisioning via the enrollment integration API.
            </p>
          )}

          <CheckboxGroup
            label="Roles"
            options={roles.map((r) => ({ code: r.code, name: r.name }))}
            selected={form.roleCodes}
            onChange={setRoleCodes}
          />

          {form.roleCodes.length > 0 && (
            <ul className="space-y-2 rounded-2xl bg-[#f3f4ff] px-4 py-3 text-xs text-[#6b6f8c]">
              {form.roleCodes.map((code) => (
                <li key={code}>
                  <span className="font-semibold text-[#12122a]">{code}</span>
                  {ROLE_ACCESS_NOTES[code] ? ` — ${ROLE_ACCESS_NOTES[code]}` : null}
                </li>
              ))}
            </ul>
          )}

          <CheckboxGroup
            label="Platforms"
            options={platformOptions
              .filter((p) => p.active)
              .map((p) => ({ code: p.code, name: p.name }))}
            selected={form.platformCodes}
            onChange={(platformCodes) => setForm((f) => ({ ...f, platformCodes }))}
          />

          {error && (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-full border border-[#dde1f5] text-sm font-medium text-[#6b6f8c] transition hover:bg-[#f3f4ff]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.roleCodes.length}
              className="h-11 flex-1 rounded-full bg-gradient-to-r from-[#635bff] to-[#7a63ff] text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [platforms, setPlatforms] = useState<AdminPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; user: AdminUser | null } | null>(
    null
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersData, rolesData, platformsData] = await Promise.all([
        listUsers(),
        listRoles(),
        listPlatforms(),
      ])
      setUsers(usersData)
      setRoles(rolesData)
      setPlatforms(platformsData)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex min-h-screen flex-col bg-[#e6e9ff]">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#12122a]">User administration</h1>
            <p className="mt-2 text-sm text-[#6b6f8c]">
              Manage users, roles, and platform access assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: 'create', user: null })}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#635bff] to-[#7a63ff] px-5 text-sm font-semibold text-white transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            New user
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#dde1f5] bg-[#f3f4ff]/60">
                  <th className="px-5 py-3 font-semibold text-[#12122a]">User</th>
                  <th className="px-5 py-3 font-semibold text-[#12122a]">Roles</th>
                  <th className="px-5 py-3 font-semibold text-[#12122a]">Platforms</th>
                  <th className="px-5 py-3 font-semibold text-[#12122a]">Status</th>
                  <th className="px-5 py-3 font-semibold text-[#12122a]">Last login</th>
                  <th className="px-5 py-3 font-semibold text-[#12122a]" />
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-[#dde1f5]">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-6 animate-pulse rounded bg-[#f3f4ff]" />
                      </td>
                    </tr>
                  ))}

                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-[#6b6f8c]">
                      No users found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-[#dde1f5] last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#12122a]">{user.fullName}</p>
                        <p className="text-xs text-[#6b6f8c]">{user.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => (
                            <span
                              key={r}
                              className="rounded-full bg-[#f3f4ff] px-2 py-0.5 text-xs font-medium text-[#635bff]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.platforms.length ? (
                            user.platforms.map((p) => (
                              <span
                                key={p}
                                className="rounded-full bg-[#e6e9ff] px-2 py-0.5 text-xs text-[#6b6f8c]"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#9aa0c3]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          )}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#6b6f8c]">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: 'edit', user })}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4ff] text-[#635bff] transition hover:bg-[#635bff] hover:text-white"
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AppFooter />

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          roles={roles}
          platforms={platforms}
          onClose={() => setModal(null)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
