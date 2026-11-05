import vine from '@vinejs/vine'
import { PlanSlug } from '#modules/documents/domain/enums/index'

const hexColor = vine.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)

export const createTenantValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    slug: vine.string().minLength(2).maxLength(100).regex(/^[a-z0-9-]+$/).optional(),
    planSlug: vine.enum(Object.values(PlanSlug)).optional(),
    ownerEmail: vine.string().email().optional(),
    ownerFullName: vine.string().minLength(2).maxLength(255).optional(),
    ownerPassword: vine.string().minLength(8).optional(),
  })
)

export const updateTenantValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255).optional(),
    slug: vine.string().minLength(2).maxLength(100).regex(/^[a-z0-9-]+$/).optional(),
    planTier: vine.string().maxLength(50).optional(),
  })
)

export const updateOrganizationValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255).optional(),
  })
)

export const updateTenantSettingsValidator = vine.compile(
  vine.object({
    timezone: vine.string().maxLength(50).optional(),
    locale: vine.string().maxLength(10).optional(),
    dateFormat: vine.string().maxLength(30).optional(),
    trackingPrefix: vine.string().minLength(2).maxLength(20).optional(),
    notificationPreferences: vine.record(vine.any()).optional(),
    featureFlags: vine.record(vine.any()).optional(),
  })
)

export const updateTenantBrandingValidator = vine.compile(
  vine.object({
    primaryColor: hexColor.optional(),
    secondaryColor: hexColor.optional(),
    faviconUrl: vine.string().url().nullable().optional(),
    loginBackgroundUrl: vine.string().url().nullable().optional(),
    customCss: vine.record(vine.any()).nullable().optional(),
  })
)

export const addTenantDomainValidator = vine.compile(
  vine.object({
    domain: vine
      .string()
      .minLength(4)
      .maxLength(255)
      .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/),
  })
)

export const verifyTenantDomainValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(32),
  })
)

export const publicBrandingValidator = vine.compile(
  vine.object({
    domain: vine.string().minLength(4).maxLength(255),
  })
)
