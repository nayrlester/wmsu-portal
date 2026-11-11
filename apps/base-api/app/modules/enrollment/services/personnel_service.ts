import User from '#modules/enrollment/models/user'
import { Exception } from '@adonisjs/core/exceptions'

const STUDENT_ROLE = 'student'

export type PersonnelSearchRow = {
  id: string
  fullName: string
  email: string
  roles: string[]
}

export class PersonnelService {
  async search(organizationId: string, input: { q?: string; limit?: number; teachingOnly?: boolean }) {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50)
    const q = input.q?.trim() ?? ''
    const query = User.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .where('status', 'active')
      .preload('roles')
      .orderBy('full_name', 'asc')
      .limit(limit)

    if (q.length >= 1) {
      query.where((sub) => {
        sub.whereILike('full_name', `%${q}%`).orWhereILike('email', `%${q}%`)
      })
    }

    if (input.teachingOnly !== false) {
      query.whereDoesntHave('roles', (roleQuery) => {
        roleQuery.where('slug', STUDENT_ROLE)
      })
    }

    const rows = await query
    return rows.map(
      (u): PersonnelSearchRow => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roles: u.roles.map((r) => r.slug),
      })
    )
  }

  async resolveUserId(
    organizationId: string,
    input: { userId?: string | null; email?: string | null }
  ) {
    if (input.userId) {
      const user = await User.query()
        .where('organization_id', organizationId)
        .where('id', input.userId.trim())
        .whereNull('deleted_at')
        .where('status', 'active')
        .first()
      if (!user) {
        throw new Exception('Personnel account not found', { status: 404, code: 'PERSONNEL_NOT_FOUND' })
      }
      return user.id
    }
    const email = input.email?.trim().toLowerCase()
    if (email) {
      const user = await User.query()
        .where('organization_id', organizationId)
        .whereRaw('LOWER(email) = ?', [email])
        .whereNull('deleted_at')
        .where('status', 'active')
        .first()
      if (!user) {
        throw new Exception('No active account for that email', { status: 404, code: 'PERSONNEL_NOT_FOUND' })
      }
      return user.id
    }
    throw new Exception('Select personnel by name or email', { status: 422, code: 'PERSONNEL_REF_REQUIRED' })
  }

  async labelsForUserIds(organizationId: string, userIds: string[]) {
    if (!userIds.length) return new Map<string, { fullName: string; email: string }>()
    const users = await User.query()
      .where('organization_id', organizationId)
      .whereIn('id', userIds)
      .whereNull('deleted_at')
    return new Map(users.map((u) => [u.id, { fullName: u.fullName, email: u.email }]))
  }
}

export const personnelService = new PersonnelService()
