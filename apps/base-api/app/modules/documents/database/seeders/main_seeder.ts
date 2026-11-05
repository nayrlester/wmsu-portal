import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import Permission from '#modules/documents/models/permission'
import Role from '#modules/documents/models/role'
import Plan from '#modules/documents/models/plan'
import Subscription from '#modules/documents/models/subscription'
import Coupon from '#modules/documents/models/coupon'
import User from '#modules/documents/models/user'
import Tenant from '#modules/documents/models/tenant'
import TenantSetting from '#modules/documents/models/tenant_setting'
import TenantBranding from '#modules/documents/models/tenant_branding'
import Department from '#modules/documents/models/department'
import DocumentType from '#modules/documents/models/document_type'
import Document from '#modules/documents/models/document'
import { ApprovalAction, DefaultRoleSlug, DocumentPriority, DocumentVisibility, PlanSlug } from '#modules/documents/domain/enums/index'
import {
  resolveRolePermissionSlugs,
  SYSTEM_PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_DEFINITIONS,
} from '#modules/documents/domain/rbac/system_role_permissions'
import { UDMS_TOR_ROLES } from '#modules/documents/domain/udms/udms_tor_roles'
import { EsignRequiredException } from '#modules/documents/domain/routing/routing_exceptions'
import { getStorageAdapter, resetStorageAdapter } from '#infrastructure/storage/storage_factory'
import DocumentFile from '#modules/documents/models/document_file'
import DocumentVersion from '#modules/documents/models/document_version'
import { tenantContext } from '#modules/documents/domain/tenant_context'
import { documentService } from '#modules/documents/services/document_service'
import { approvalService } from '#modules/documents/services/approval_service'
import { retentionScheduleService } from '#modules/documents/services/retention_schedule_service'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'

const DEFAULT_WORKFLOW_STEP_ID = 'review'
const DEMO_DOCX_NAME = 'DocsTrack-API-Specs-Manual.docx'
const DEMO_DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type SampleDocumentOutcome = 'draft' | 'pending' | 'approved' | 'rejected'

interface SampleDocumentSeed {
  title: string
  description: string
  priority: DocumentPriority
  outcome: SampleDocumentOutcome
  monthsAgo: number
  visibility?: DocumentVisibility
  contentHtml?: string
}

export default class extends BaseSeeder {
  async run() {
    const createdPermissions = await Permission.updateOrCreateMany(
      'slug',
      SYSTEM_PERMISSION_DEFINITIONS.map((p) => ({ ...p, description: null }))
    )

    const permissionMap = Object.fromEntries(createdPermissions.map((p) => [p.slug, p.id]))

    await Plan.updateOrCreateMany('slug', [
      {
        name: 'Starter',
        slug: PlanSlug.STARTER,
        description: 'For small teams getting started',
        monthlyPrice: 29,
        annualPrice: 290,
        currency: 'USD',
        maxUsers: 10,
        maxDocuments: 1000,
        maxStorageBytes: 5_368_709_120,
        features: { ocr: false, ai: false, workflows: 3 },
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Business',
        slug: PlanSlug.BUSINESS,
        description: 'For growing organizations',
        monthlyPrice: 99,
        annualPrice: 990,
        currency: 'USD',
        maxUsers: 50,
        maxDocuments: 10000,
        maxStorageBytes: 53_687_091_200,
        features: { ocr: true, ai: true, workflows: 25 },
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Enterprise',
        slug: PlanSlug.ENTERPRISE,
        description: 'Unlimited scale for large organizations',
        monthlyPrice: 299,
        annualPrice: 2990,
        currency: 'USD',
        maxUsers: null,
        maxDocuments: null,
        maxStorageBytes: null,
        features: { ocr: true, ai: true, workflows: -1, whiteLabel: true },
        isActive: true,
        sortOrder: 3,
      },
    ])

    await Coupon.updateOrCreateMany('code', [
      {
        code: 'WELCOME20',
        discountType: 'percent',
        discountValue: 20,
        maxUses: 1000,
        usedCount: 0,
        expiresAt: DateTime.now().plus({ years: 1 }),
        isActive: true,
      },
      {
        code: 'GOV50',
        discountType: 'fixed',
        discountValue: 50,
        maxUses: 100,
        usedCount: 0,
        expiresAt: DateTime.now().plus({ months: 6 }),
        isActive: true,
      },
    ])

    const demoTenant = await Tenant.updateOrCreate(
      { slug: 'demo-gov' },
      {
        name: 'Demo Municipality',
        slug: 'demo-gov',
        status: 'active',
        planTier: 'business',
      }
    )

    await TenantSetting.updateOrCreate(
      { tenantId: demoTenant.id },
      {
        tenantId: demoTenant.id,
        timezone: 'Asia/Manila',
        locale: 'en',
        dateFormat: 'YYYY-MM-DD',
        trackingPrefix: 'DTS',
      }
    )

    await TenantBranding.updateOrCreate(
      { tenantId: demoTenant.id },
      {
        tenantId: demoTenant.id,
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
      }
    )

    const department = await Department.updateOrCreate(
      { tenantId: demoTenant.id, code: 'ADMIN' },
      {
        tenantId: demoTenant.id,
        name: 'Administration',
        code: 'ADMIN',
        description: 'Central administration office',
        isActive: true,
      }
    )

    const documentType = await DocumentType.updateOrCreate(
      { tenantId: demoTenant.id, code: 'MEMO' },
      {
        tenantId: demoTenant.id,
        name: 'Memorandum',
        code: 'MEMO',
        description: 'Internal memorandum',
        isActive: true,
      }
    )

    const allPermissionSlugs = Object.keys(permissionMap)

    for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
      const role = await Role.updateOrCreate(
        { tenantId: demoTenant.id, slug: roleDef.slug },
        {
          tenantId: demoTenant.id,
          name: roleDef.name,
          slug: roleDef.slug,
          description: null,
          isSystem: true,
        }
      )

      const permSlugs = resolveRolePermissionSlugs(roleDef.slug, allPermissionSlugs)
      const permIds = permSlugs.map((slug) => permissionMap[slug]).filter(Boolean)
      await role.related('permissions').sync(
        Object.fromEntries(permIds.map((id) => [id, { created_at: new Date() }]))
      )
    }

    for (const torRole of UDMS_TOR_ROLES) {
      const role = await Role.updateOrCreate(
        { tenantId: demoTenant.id, slug: torRole.slug },
        {
          tenantId: demoTenant.id,
          name: torRole.torName,
          slug: torRole.slug,
          description: torRole.description,
          isSystem: true,
        }
      )

      const permSlugs =
        torRole.permissionSlugs === '*'
          ? allPermissionSlugs
          : [...torRole.permissionSlugs]
      const permIds = permSlugs.map((slug) => permissionMap[slug]).filter(Boolean)
      await role.related('permissions').sync(
        Object.fromEntries(permIds.map((id) => [id, { created_at: new Date() }]))
      )
    }

    const { rbacService } = await import('#modules/documents/services/rbac_service')
    await rbacService.invalidateTenantRoleCaches(demoTenant.id)

    const ownerRole = await Role.query()
      .where('tenant_id', demoTenant.id)
      .where('slug', DefaultRoleSlug.TENANT_OWNER)
      .firstOrFail()

    // Migrate legacy demo emails before upsert so existing rows keep their IDs.
    // @gmail.com matches PandaDoc sandbox org-domain rules for local e-sign testing.
    await this.migrateLegacyDemoEmails([
      ['superadmin@cdts.io', 'arzaitsolutions@gmail.com'],
      ['superadmin@gmail.com', 'arzaitsolutions@gmail.com'],
      ['owner@demo.gov.ph', 'owner@gmail.com'],
      ['admin@demo.gov.ph', 'admin@gmail.com'],
      ['manager@demo.gov.ph', 'manager@gmail.com'],
      ['approver@demo.gov.ph', 'approver@gmail.com'],
      ['staff@demo.gov.ph', 'staff@gmail.com'],
      ['viewer@demo.gov.ph', 'viewer@gmail.com'],
      ['owner@demo.com', 'owner@gmail.com'],
      ['admin@demo.com', 'admin@gmail.com'],
      ['manager@demo.com', 'manager@gmail.com'],
      ['approver@demo.com', 'approver@gmail.com'],
      ['staff@demo.com', 'staff@gmail.com'],
      ['viewer@demo.com', 'viewer@gmail.com'],
    ])

    const superAdmin = await User.updateOrCreate(
      { email: 'arzaitsolutions@gmail.com' },
      {
        email: 'arzaitsolutions@gmail.com',
        password: 'ChangeMe123!',
        fullName: 'Platform Super Admin',
        status: 'active',
        tenantId: demoTenant.id,
        isSuperAdmin: true,
        emailVerified: true,
      }
    )

    await superAdmin.related('roles').sync({
      [ownerRole.id]: { tenant_id: demoTenant.id, created_at: new Date() },
    })

    const approverRole = await Role.query()
      .where('tenant_id', demoTenant.id)
      .where('slug', DefaultRoleSlug.APPROVER)
      .firstOrFail()

    const owner = await User.updateOrCreate(
      { email: 'owner@gmail.com' },
      {
        email: 'owner@gmail.com',
        password: 'ChangeMe123!',
        fullName: 'Demo Tenant Owner',
        status: 'active',
        tenantId: demoTenant.id,
        emailVerified: true,
        isSuperAdmin: false,
      }
    )

    await owner.related('roles').sync({
      [ownerRole.id]: { tenant_id: demoTenant.id, created_at: new Date() },
    })

    const demoPassword = 'ChangeMe123!'
    const demoRoleUsers = [
      { email: 'admin@gmail.com', fullName: 'Demo Admin', roleSlug: DefaultRoleSlug.ADMIN },
      { email: 'manager@gmail.com', fullName: 'Demo Manager', roleSlug: DefaultRoleSlug.MANAGER },
      { email: 'approver@gmail.com', fullName: 'Demo Approver', roleSlug: DefaultRoleSlug.APPROVER },
      { email: 'staff@gmail.com', fullName: 'Demo Member', roleSlug: DefaultRoleSlug.STAFF },
      { email: 'viewer@gmail.com', fullName: 'Demo User', roleSlug: DefaultRoleSlug.VIEWER },
    ]

    for (const demoUser of demoRoleUsers) {
      const role = await Role.query()
        .where('tenant_id', demoTenant.id)
        .where('slug', demoUser.roleSlug)
        .firstOrFail()

      const user = await User.updateOrCreate(
        { email: demoUser.email },
        {
          email: demoUser.email,
          password: demoPassword,
          fullName: demoUser.fullName,
          status: 'active',
          tenantId: demoTenant.id,
          emailVerified: true,
          isSuperAdmin: false,
        }
      )

      await user.related('roles').sync({
        [role.id]: { tenant_id: demoTenant.id, created_at: new Date() },
      })
    }

    // Mirror UDMS demo staff into Identity so gateway login accepts the same emails/password
    try {
      const { provisionIdentityDocstrackStaff } = await import(
        '#modules/documents/services/platform/identity_docstrack_staff_client'
      )
      const identityMirrors = [
        { email: 'arzaitsolutions@gmail.com', fullName: 'Platform Super Admin', id: superAdmin.id },
        { email: 'owner@gmail.com', fullName: 'Demo Tenant Owner', id: owner.id },
        ...demoRoleUsers.map((d) => ({ email: d.email, fullName: d.fullName, id: d.email })),
      ]
      for (const row of identityMirrors) {
        const local = await User.query().where('email', row.email).first()
        await provisionIdentityDocstrackStaff({
          externalId: `docstrack-user:${local?.id ?? row.id}`,
          email: row.email,
          fullName: row.fullName,
          password: demoPassword,
        })
      }
      console.log('[cdts] Mirrored demo staff into Identity (if PLATFORM_IDENTITY_URL configured)')
    } catch (err) {
      console.warn('[cdts] Identity mirror skipped:', err instanceof Error ? err.message : err)
    }

    const { defaultWorkflowService } = await import('#modules/documents/services/default_workflow_service')
    await defaultWorkflowService.provisionForTenant(demoTenant.id, approverRole.id, owner.id)
    await defaultWorkflowService.repairDefaultWorkflowAssignee(demoTenant.id, approverRole.id)
    await retentionScheduleService.ensureDefaultsForTenant(demoTenant.id)

    const businessPlan = await Plan.query().where('slug', PlanSlug.BUSINESS).firstOrFail()
    const existingSubscription = await Subscription.query()
      .where('tenant_id', demoTenant.id)
      .whereNull('deleted_at')
      .first()

    if (!existingSubscription) {
      await Subscription.create({
        tenantId: demoTenant.id,
        planId: businessPlan.id,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: DateTime.now(),
        currentPeriodEnd: DateTime.now().plus({ months: 1 }),
      })
    }

    const staffUser = await User.query().where('email', 'staff@gmail.com').firstOrFail()
    const approverUser = await User.query().where('email', 'approver@gmail.com').firstOrFail()

    await this.seedDemoDocuments({
      tenant: demoTenant,
      departmentId: department.id,
      documentTypeId: documentType.id,
      staffUserId: staffUser.id,
      approverUserId: approverUser.id,
    })
  }

  private async seedDemoDocuments(options: {
    tenant: Tenant
    departmentId: string
    documentTypeId: string
    staffUserId: string
    approverUserId: string
  }) {
    // Always refresh demo documents so storage keys match the current S3/R2 bucket.
    const sampleTitles = [
      'Annual Budget Allocation FY2026',
      'Personnel Reassignment Memo',
      'Q1 Citizen Services Report',
      'Test 2',
      'Procurement Request — Office Supplies',
      'Vendor Contract Renewal',
      'Barangay Coordination Draft',
      'Community Outreach Brief',
      'E-Sign Demo — DocsTrack API Specs',
    ]

    await Document.query()
      .where('tenant_id', options.tenant.id)
      .whereIn('title', sampleTitles)
      .whereNull('deleted_at')
      .update({ deleted_at: DateTime.now().toSQL() })

    const samples: SampleDocumentSeed[] = [
      {
        title: 'Annual Budget Allocation FY2026',
        description: 'Proposed budget distribution across municipal departments.',
        priority: DocumentPriority.HIGH,
        outcome: 'approved',
        monthsAgo: 5,
        visibility: DocumentVisibility.PUBLIC,
      },
      {
        title: 'Personnel Reassignment Memo',
        description: 'Internal transfer request for records division staff.',
        priority: DocumentPriority.MEDIUM,
        outcome: 'approved',
        monthsAgo: 3,
        visibility: DocumentVisibility.PRIVATE,
      },
      {
        title: 'Q1 Citizen Services Report',
        description: 'Quarterly summary of frontline service delivery metrics.',
        priority: DocumentPriority.MEDIUM,
        outcome: 'approved',
        monthsAgo: 1,
        visibility: DocumentVisibility.PUBLIC,
      },
      {
        title: 'Test 2',
        description: 'Sample document awaiting approver action.',
        priority: DocumentPriority.MEDIUM,
        outcome: 'pending',
        monthsAgo: 0,
      },
      {
        title: 'Procurement Request — Office Supplies',
        description: 'Request for Q2 stationery and printing supplies.',
        priority: DocumentPriority.HIGH,
        outcome: 'pending',
        monthsAgo: 0,
      },
      {
        title: 'Vendor Contract Renewal',
        description: 'Annual maintenance contract for IT infrastructure.',
        priority: DocumentPriority.MEDIUM,
        outcome: 'rejected',
        monthsAgo: 2,
      },
      {
        title: 'Barangay Coordination Draft',
        description: 'Draft memorandum for upcoming barangay assembly.',
        priority: DocumentPriority.LOW,
        outcome: 'draft',
        monthsAgo: 0,
        visibility: DocumentVisibility.PRIVATE,
        contentHtml:
          '<h2>Barangay coordination</h2><p>Draft memorandum outlining assembly agenda and coordination points.</p>',
      },
      {
        title: 'Community Outreach Brief',
        description: 'Upload briefing materials for public information officers.',
        priority: DocumentPriority.MEDIUM,
        outcome: 'draft',
        monthsAgo: 0,
        visibility: DocumentVisibility.PUBLIC,
      },
      {
        title: 'E-Sign Demo — DocsTrack API Specs',
        description:
          'Draft document with DocsTrack-API-Specs-Manual.docx attached for in-app e-sign testing.',
        priority: DocumentPriority.HIGH,
        outcome: 'draft',
        monthsAgo: 0,
        visibility: DocumentVisibility.PRIVATE,
      },
    ]

    resetStorageAdapter()

    await tenantContext.run(
      { tenantId: options.tenant.id, tenantSlug: options.tenant.slug },
      async () => {
        for (const sample of samples) {
          const createdAt = this.sampleCreatedAt(sample.monthsAgo)
          const submittedAt = sample.outcome === 'draft' ? null : createdAt.plus({ days: 1 })

          const document = await documentService.create(
            {
              title: sample.title,
              description: sample.description,
              priority: sample.priority,
              departmentId: options.departmentId,
              documentTypeId: options.documentTypeId,
              visibility: sample.visibility ?? DocumentVisibility.PRIVATE,
              contentHtml: sample.contentHtml,
            },
            options.staffUserId
          )

          if (sample.outcome !== 'draft') {
            await documentService.submit(document.id, options.staffUserId)
          }

          if (sample.outcome === 'approved') {
            try {
              await approvalService.processAction({
                documentId: document.id,
                userId: options.approverUserId,
                action: ApprovalAction.APPROVE,
                stepNodeId: DEFAULT_WORKFLOW_STEP_ID,
                comments: 'Approved during demo data seeding.',
              })
            } catch (error) {
              // PandaDoc gate: leave pending when e-sign is required in this environment.
              if (!(error instanceof EsignRequiredException)) {
                throw error
              }
            }
          }

          if (sample.outcome === 'rejected') {
            await approvalService.processAction({
              documentId: document.id,
              userId: options.approverUserId,
              action: ApprovalAction.REJECT,
              stepNodeId: DEFAULT_WORKFLOW_STEP_ID,
              comments: 'Rejected — incomplete supporting documents.',
            })
          }

          const completedAt =
            sample.outcome === 'approved' ? submittedAt?.plus({ days: 2 }) ?? createdAt.plus({ days: 3 }) : null

          await Document.query().where('id', document.id).update({
            created_at: createdAt.toSQL(),
            updated_at: (completedAt ?? submittedAt ?? createdAt).toSQL(),
            submitted_at: submittedAt?.toSQL() ?? null,
            completed_at: completedAt?.toSQL() ?? null,
          })

          if (!sample.contentHtml) {
            await this.seedDemoFile(document.id, options.tenant.id, createdAt)
          }
        }

        await this.seedFilesTrendDemoData(options.tenant.id)
      }
    )
  }

  private resolveDemoDocxPath(): string {
    const candidates = [
      app.makePath('resources/demo', DEMO_DOCX_NAME),
      app.makePath('..', 'docs', DEMO_DOCX_NAME),
      join(process.cwd(), 'resources', 'demo', DEMO_DOCX_NAME),
      join(process.cwd(), '..', 'docs', DEMO_DOCX_NAME),
    ]
    const found = candidates.find((path) => existsSync(path))
    if (!found) {
      throw new Error(
        `Demo DOCX not found. Place ${DEMO_DOCX_NAME} in api/resources/demo/ or CDTS_Zamboanga/docs/`
      )
    }
    return found
  }

  private async seedDemoFile(documentId: string, tenantId: string, createdAt: DateTime) {
    const version = await DocumentVersion.query()
      .where('document_id', documentId)
      .orderBy('version_number', 'asc')
      .first()
    if (!version) return

    const docxPath = this.resolveDemoDocxPath()
    const buffer = readFileSync(docxPath)
    const checksum = createHash('sha256').update(buffer).digest('hex')
    const s3Key = `tenants/${tenantId}/documents/${documentId}/v0_1/${DEMO_DOCX_NAME}`
    const storage = getStorageAdapter()

    await storage.upload({
      key: s3Key,
      body: buffer,
      contentType: DEMO_DOCX_MIME,
      metadata: {
        tenantId,
        documentId,
        source: 'demo-seeder',
        checksum,
      },
    })

    await DocumentFile.create({
      tenantId,
      documentId,
      versionId: version.id,
      fileName: DEMO_DOCX_NAME,
      originalName: DEMO_DOCX_NAME,
      mimeType: DEMO_DOCX_MIME,
      fileSize: buffer.byteLength,
      s3Key,
      s3Bucket: storage.bucket,
      checksum,
      virusScanned: true,
      virusClean: true,
      extractedMetadata: {
        source: 'demo-seeder',
        searchText: 'DocsTrack API Specs Manual demo attachment',
      },
      createdAt,
    })
  }

  private async seedFilesTrendDemoData(tenantId: string) {
    const files = await DocumentFile.query().where('tenant_id', tenantId).orderBy('created_at', 'asc')
    for (let index = 0; index < files.length; index += 1) {
      const dayOffset = (index % 28) + 1
      const createdAt = DateTime.now().minus({ days: dayOffset }).set({ hour: 10, minute: 0 })
      await DocumentFile.query().where('id', files[index].id).update({
        created_at: createdAt.toSQL(),
      })
    }
  }

  private sampleCreatedAt(monthsAgo: number): DateTime {
    return DateTime.now()
      .setZone('Asia/Manila')
      .minus({ months: monthsAgo })
      .startOf('month')
      .plus({ days: 10, hours: 9 })
  }

  private async migrateLegacyDemoEmails(migrations: Array<[string, string]>) {
    for (const [legacyEmail, currentEmail] of migrations) {
      const legacyUser = await User.findBy('email', legacyEmail)
      if (!legacyUser) continue

      const existingCurrent = await User.findBy('email', currentEmail)
      if (existingCurrent && existingCurrent.id !== legacyUser.id) {
        await this.reassignUserReferences(legacyUser.id, existingCurrent.id)
        await db.from('user_roles').where('user_id', legacyUser.id).delete()
        await legacyUser.delete()
        continue
      }

      legacyUser.email = currentEmail
      await legacyUser.save()
    }
  }

  private async reassignUserReferences(fromUserId: string, toUserId: string) {
    const references: Array<{ table: string; column: string }> = [
      { table: 'documents', column: 'created_by_id' },
      { table: 'documents', column: 'assigned_to_id' },
      { table: 'documents', column: 'updated_by_id' },
      { table: 'document_versions', column: 'created_by_id' },
      { table: 'approvals', column: 'approver_id' },
      { table: 'routing_entries', column: 'from_user_id' },
      { table: 'routing_entries', column: 'to_user_id' },
      { table: 'comments', column: 'user_id' },
      { table: 'workflows', column: 'created_by_id' },
      { table: 'audit_logs', column: 'user_id' },
      { table: 'departments', column: 'head_user_id' },
      { table: 'workflow_steps', column: 'assignee_user_id' },
    ]

    for (const { table, column } of references) {
      await db.from(table).where(column, fromUserId).update({ [column]: toUserId })
    }
  }
}
