import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#modules/library/models/tenant'
import User from '#modules/library/models/user'
import Role from '#modules/library/models/role'
import Category from '#modules/library/models/category'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import Member from '#modules/library/models/member'
import Borrowing from '#modules/library/models/borrowing'
import RbacService from '#modules/library/services/auth/rbac_service'
import { buildMemberSearchText, generateLibraryCardNumber } from '#modules/library/services/members/member_helpers'
import { DEMO_PASSWORD, DEMO_TENANT, DEMO_USERS, demoLoginSummary } from '#modules/library/database/data/demo_config'
import { DEMO_BOOKS, DEMO_MEMBERS } from '#modules/library/database/data/demo_catalog'
import SearchIndexerService from '#modules/library/services/search/search_indexer_service'

export default class extends BaseSeeder {
  private rbacService = new RbacService()

  async run() {
    await this.rbacService.ensureGlobalPermissions()

    let tenant = await Tenant.findBy('slug', DEMO_TENANT.slug)

    if (!tenant) {
      tenant = await this.createDemoTenant()
      console.log('[demo] Created demo tenant and sample data')
    } else {
      await this.ensureDemoUsers(tenant)
      await this.ensureSampleCatalog(tenant)
      await this.ensureDemoBooks(tenant)
      await this.ensureDemoMembers(tenant)
      await this.ensureStudentMember(tenant)
      console.log('[demo] Demo tenant already exists — ensured users, members, and catalog')
    }

    const indexer = new SearchIndexerService()
    const stats = await indexer.reindexTenant(tenant.id)
    console.log(
      `[demo] Search index: ${stats.books} books, ${stats.members} members, ${stats.transactions} transactions`
    )

    const summary = demoLoginSummary()
    console.log('[demo] Login credentials:')
    console.log(`  Tenant slug : ${summary.tenantSlug}`)
    console.log(`  Password    : ${summary.password}`)
    for (const account of summary.accounts) {
      console.log(`  ${account.role.padEnd(10)}: ${account.email}`)
    }
  }

  private async createDemoTenant() {
    return db.transaction(async (trx) => {
      const tenant = await Tenant.create(
        {
          name: DEMO_TENANT.name,
          slug: DEMO_TENANT.slug,
          type: DEMO_TENANT.type,
          status: 'active',
          timezone: 'Asia/Manila',
          locale: 'en-PH',
        },
        { client: trx }
      )

      await this.rbacService.seedTenantRoles(tenant.id, trx)
      await this.ensureDemoUsers(tenant, trx)

      const admin = await User.query({ client: trx })
        .where('tenant_id', tenant.id)
        .where('email', DEMO_USERS.admin.email)
        .firstOrFail()

      await this.seedSampleCatalog(tenant, admin.id, trx)
      await this.ensureStudentMember(tenant, trx)

      return tenant
    })
  }

  private async ensureDemoUsers(tenant: Tenant, trx?: TransactionClientContract) {
    const passwordHash = await hash.make(DEMO_PASSWORD)

    for (const def of Object.values(DEMO_USERS)) {
      const role = await Role.query(trx ? { client: trx } : undefined)
        .where('tenant_id', tenant.id)
        .where('code', def.role)
        .firstOrFail()

      let user = await User.query(trx ? { client: trx } : undefined)
        .where('tenant_id', tenant.id)
        .where('email', def.email)
        .first()

      if (!user) {
        user = await User.create(
          {
            tenantId: tenant.id,
            email: def.email,
            password: passwordHash,
            fullName: def.fullName,
            status: 'active',
            emailVerifiedAt: DateTime.now(),
          },
          trx ? { client: trx } : undefined
        )

        await user.related('roles').attach(
          { [role.id]: { assigned_at: DateTime.now().toSQL() } },
          trx
        )
      } else {
        user.password = passwordHash
        user.status = 'active'
        if (trx) user.useTransaction(trx)
        await user.save()

        const attached = await user.related('roles').query().where('roles.id', role.id).first()
        if (!attached) {
          await user.related('roles').attach(
            { [role.id]: { assigned_at: DateTime.now().toSQL() } },
            trx
          )
        }
      }
    }
  }

  /** Keep student login email aligned with an approved member profile (portal). */
  private async ensureStudentMember(tenant: Tenant, trx?: TransactionClientContract) {
    const student = DEMO_USERS.student
    const admin = await User.query(trx ? { client: trx } : undefined)
      .where('tenant_id', tenant.id)
      .where('email', DEMO_USERS.admin.email)
      .first()

    let member = await Member.query(trx ? { client: trx } : undefined)
      .where('tenant_id', tenant.id)
      .whereNull('deleted_at')
      .whereILike('email', student.email)
      .first()

    if (!member) {
      const count = await Member.query(trx ? { client: trx } : undefined)
        .where('tenant_id', tenant.id)
        .count('* as total')
        .first()
      const card = generateLibraryCardNumber(tenant.id, Number(count?.$extras.total ?? 0) + 1)

      member = await Member.create(
        {
          tenantId: tenant.id,
          fullName: student.fullName,
          email: student.email,
          contact: '+15550101001',
          department: 'Computer Science',
          memberType: 'student',
          membershipStatus: 'approved',
          libraryCardNumber: card,
          approvedAt: DateTime.now(),
          approvedBy: admin?.id ?? null,
          membershipExpiresAt: DateTime.now().plus({ days: 365 }),
          isBlacklisted: false,
          isEnrolled: true,
          academicStatus: 'enrolled',
          searchText: buildMemberSearchText({
            fullName: student.fullName,
            email: student.email,
            contact: '+15550101001',
            department: 'Computer Science',
            libraryCardNumber: card,
            memberType: 'student',
          }),
        },
        trx ? { client: trx } : undefined
      )
      return
    }

    member.fullName = student.fullName
    member.membershipStatus = 'approved'
    member.memberType = 'student'
    member.isBlacklisted = false
    member.isEnrolled = true
    member.academicStatus = 'enrolled'
    if (!member.membershipExpiresAt) {
      member.membershipExpiresAt = DateTime.now().plus({ days: 365 })
    }
    if (trx) member.useTransaction(trx)
    await member.save()
  }

  private async ensureSampleCatalog(tenant: Tenant) {
    const bookCount = await Book.query().where('tenant_id', tenant.id).whereNull('deleted_at').count('* as total')
    if (Number(bookCount[0]?.$extras.total ?? 0) > 0) return

    const admin = await User.query()
      .where('tenant_id', tenant.id)
      .where('email', DEMO_USERS.admin.email)
      .firstOrFail()

    await db.transaction(async (trx) => {
      await this.seedSampleCatalog(tenant, admin.id, trx)
    })
  }

  private async ensureDemoBooks(tenant: Tenant) {
    await db.transaction(async (trx) => {
      const category = await this.ensureFictionCategory(tenant, trx)
      for (const data of DEMO_BOOKS) {
        await this.ensureBookWithCopies(tenant, category.id, data, trx)
      }
    })
  }

  private async ensureDemoMembers(tenant: Tenant) {
    const admin = await User.query()
      .where('tenant_id', tenant.id)
      .where('email', DEMO_USERS.admin.email)
      .first()

    await db.transaction(async (trx) => {
      for (const data of DEMO_MEMBERS) {
        await this.ensureMember(tenant, data, admin?.id ?? null, trx)
      }
    })
  }

  private async ensureFictionCategory(tenant: Tenant, trx: TransactionClientContract) {
    let category = await Category.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('slug', 'fiction')
      .first()

    if (!category) {
      category = await Category.create(
        {
          tenantId: tenant.id,
          name: 'Fiction',
          slug: 'fiction',
        },
        { client: trx }
      )
    }

    return category
  }

  private async ensureBookWithCopies(
    tenant: Tenant,
    categoryId: string,
    data: (typeof DEMO_BOOKS)[number],
    trx: TransactionClientContract
  ) {
    let book = await Book.query({ client: trx })
      .where('tenant_id', tenant.id)
      .whereNull('deleted_at')
      .where('isbn13', data.isbn13)
      .first()

    if (!book) {
      book = await Book.create(
        {
          tenantId: tenant.id,
          title: data.title,
          authorNames: data.authorNames,
          isbn13: data.isbn13,
          description: data.description,
          categoryId,
          isDigital: false,
          searchText: `${data.title} ${data.authorNames}`.toLowerCase(),
        },
        { client: trx }
      )
    }

    const existingCopies = await BookCopy.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('book_id', book.id)
      .count('* as total')
      .first()

    const copyCount = Number(existingCopies?.$extras.total ?? 0)
    for (let i = copyCount + 1; i <= data.copies; i++) {
      await BookCopy.create(
        {
          tenantId: tenant.id,
          bookId: book.id,
          barcode: `DEMO-${book.id.slice(0, 4).toUpperCase()}-${String(i).padStart(3, '0')}`,
          copyNumber: i,
          status: 'available',
          shelfLocation: `A-${i}`,
          condition: 'good',
        },
        { client: trx }
      )
    }

    return book
  }

  private async ensureMember(
    tenant: Tenant,
    data: (typeof DEMO_MEMBERS)[number],
    adminUserId: string | null,
    trx: TransactionClientContract
  ) {
    let member = await Member.query({ client: trx })
      .where('tenant_id', tenant.id)
      .whereNull('deleted_at')
      .whereILike('email', data.email)
      .first()

    if (member) {
      member.fullName = data.fullName
      member.contact = data.contact
      member.department = data.department
      member.memberType = data.memberType
      member.membershipStatus = data.membershipStatus
      if (data.membershipStatus === 'approved') {
        member.isBlacklisted = false
        member.isEnrolled = true
        member.academicStatus = 'enrolled'
        if (!member.approvedAt) member.approvedAt = DateTime.now()
        if (!member.approvedBy && adminUserId) member.approvedBy = adminUserId
        if (!member.membershipExpiresAt) {
          member.membershipExpiresAt = DateTime.now().plus({ days: 365 })
        }
      }
      member.searchText = buildMemberSearchText({
        fullName: member.fullName,
        email: member.email,
        contact: member.contact,
        department: member.department,
        libraryCardNumber: member.libraryCardNumber,
        memberType: member.memberType,
      })
      member.useTransaction(trx)
      await member.save()
      return member
    }

    const count = await Member.query({ client: trx })
      .where('tenant_id', tenant.id)
      .count('* as total')
      .first()
    const card = generateLibraryCardNumber(tenant.id, Number(count?.$extras.total ?? 0) + 1)
    const approved = data.membershipStatus === 'approved'

    return Member.create(
      {
        tenantId: tenant.id,
        fullName: data.fullName,
        email: data.email,
        contact: data.contact,
        department: data.department,
        memberType: data.memberType,
        membershipStatus: data.membershipStatus,
        libraryCardNumber: card,
        approvedAt: approved ? DateTime.now() : null,
        approvedBy: approved ? adminUserId : null,
        membershipExpiresAt: approved ? DateTime.now().plus({ days: 365 }) : null,
        isBlacklisted: false,
        isEnrolled: approved,
        academicStatus: approved ? 'enrolled' : null,
        searchText: buildMemberSearchText({
          fullName: data.fullName,
          email: data.email,
          contact: data.contact,
          department: data.department,
          libraryCardNumber: card,
          memberType: data.memberType,
        }),
      },
      { client: trx }
    )
  }

  private async seedSampleCatalog(
    tenant: Tenant,
    adminUserId: string,
    trx: TransactionClientContract
  ) {
    const category = await this.ensureFictionCategory(tenant, trx)

    const books: Book[] = []
    for (const data of DEMO_BOOKS) {
      books.push(await this.ensureBookWithCopies(tenant, category.id, data, trx))
    }

    for (const data of DEMO_MEMBERS) {
      await this.ensureMember(tenant, data, adminUserId, trx)
    }

    const memberJane = await Member.query({ client: trx })
      .where('tenant_id', tenant.id)
      .whereILike('email', DEMO_USERS.student.email)
      .firstOrFail()

    const book1984 = books[0]!
    const copy = await BookCopy.query({ client: trx })
      .where('book_id', book1984.id)
      .where('tenant_id', tenant.id)
      .firstOrFail()

    const now = DateTime.now()
    const year = now.year

    const existingBorrowings = await Borrowing.query({ client: trx })
      .where('tenant_id', tenant.id)
      .count('* as total')
      .first()

    if (Number(existingBorrowings?.$extras.total ?? 0) > 0) {
      return
    }

    await Borrowing.create(
      {
        tenantId: tenant.id,
        transactionNumber: `BRW-${year}-000001`,
        memberId: memberJane.id,
        bookId: book1984.id,
        copyId: copy.id,
        status: 'returned',
        requestedAt: now.minus({ days: 14 }),
        approvedAt: now.minus({ days: 14 }),
        approvedBy: adminUserId,
        borrowedAt: now.minus({ days: 14 }),
        dueAt: now.minus({ days: 7 }),
        returnedAt: now.minus({ days: 8 }),
        returnedBy: adminUserId,
        checkedOutBy: adminUserId,
      },
      { client: trx }
    )

    await copy.merge({ status: 'available' }).useTransaction(trx).save()

    const gatsby = books[1]!
    const gatsbyCopy = await BookCopy.query({ client: trx })
      .where('book_id', gatsby.id)
      .where('tenant_id', tenant.id)
      .firstOrFail()

    await Borrowing.create(
      {
        tenantId: tenant.id,
        transactionNumber: `BRW-${year}-000002`,
        memberId: memberJane.id,
        bookId: gatsby.id,
        copyId: gatsbyCopy.id,
        status: 'borrowed',
        requestedAt: now.minus({ days: 3 }),
        approvedAt: now.minus({ days: 3 }),
        approvedBy: adminUserId,
        borrowedAt: now.minus({ days: 3 }),
        dueAt: now.plus({ days: 11 }),
        checkedOutBy: adminUserId,
      },
      { client: trx }
    )

    await gatsbyCopy.merge({ status: 'on_loan' }).useTransaction(trx).save()

    const mockingbird = books[2]!
    await Borrowing.create(
      {
        tenantId: tenant.id,
        transactionNumber: `BRW-${year}-000003`,
        memberId: memberJane.id,
        bookId: mockingbird.id,
        status: 'requested',
        requestedAt: now.minus({ hours: 2 }),
        notes: 'Demo borrow request awaiting approval',
      },
      { client: trx }
    )
  }
}
