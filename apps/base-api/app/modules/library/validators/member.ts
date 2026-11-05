import vine from '@vinejs/vine'

const memberTypes = ['student', 'faculty', 'employee', 'researcher', 'guest', 'alumni'] as const

export const createMemberValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(200),
    email: vine.string().trim().email().optional(),
    contact: vine.string().trim().maxLength(50).optional(),
    department: vine.string().trim().maxLength(200).optional(),
    memberType: vine.enum(memberTypes),
    notes: vine.string().trim().optional(),
    autoApprove: vine.boolean().optional(),
    isBlacklisted: vine.boolean().optional(),
    isEnrolled: vine.boolean().optional(),
    academicStatus: vine.string().trim().maxLength(50).optional(),
  })
)

export const updateMemberValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(200).optional(),
    email: vine.string().trim().email().nullable().optional(),
    contact: vine.string().trim().maxLength(50).nullable().optional(),
    department: vine.string().trim().maxLength(200).nullable().optional(),
    memberType: vine.enum(memberTypes).optional(),
    membershipStatus: vine
      .enum(['pending', 'approved', 'rejected', 'suspended', 'expired'])
      .optional(),
    notes: vine.string().trim().nullable().optional(),
    isBlacklisted: vine.boolean().optional(),
    isEnrolled: vine.boolean().optional(),
    academicStatus: vine.string().trim().maxLength(50).nullable().optional(),
  })
)

export const rejectMemberValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().maxLength(500).optional(),
  })
)

export const listMembersValidator = vine.compile(
  vine.object({
    search: vine.string().trim().optional(),
    memberType: vine.enum(memberTypes).optional(),
    membershipStatus: vine
      .enum(['pending', 'approved', 'rejected', 'suspended', 'expired'])
      .optional(),
    department: vine.string().trim().optional(),
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
  })
)
