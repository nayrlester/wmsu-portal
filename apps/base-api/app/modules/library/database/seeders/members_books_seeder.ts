/**
 * Seed sample books + members for reservations / circulation testing.
 *
 * Run:
 *   node ace db:seed --files=database/seeders/members_books_seeder.ts
 *
 * Targets DEFAULT_TENANT_SLUG (university mode), else "demo".
 */
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#modules/library/models/tenant'
import User from '#modules/library/models/user'
import Category from '#modules/library/models/category'
import Book from '#modules/library/models/book'
import BookCopy from '#modules/library/models/book_copy'
import Member from '#modules/library/models/member'
import env from '#start/env'
import { DEMO_BOOKS, DEMO_MEMBERS } from '#modules/library/database/data/demo_catalog'
import { buildMemberSearchText, generateLibraryCardNumber } from '#modules/library/services/members/member_helpers'
import SearchIndexerService from '#modules/library/services/search/search_indexer_service'

export default class extends BaseSeeder {
  async run() {
    const tenant = await this.resolveTenant()
    if (!tenant) {
      console.error(
        '[members-books] No tenant found. Run ulmis_bootstrap_seeder or demo_seeder first.'
      )
      return
    }

    const admin = await User.query()
      .where('tenant_id', tenant.id)
      .whereNull('deleted_at')
      .orderBy('created_at', 'asc')
      .first()

    let booksCreated = 0
    let booksExisting = 0
    let membersCreated = 0
    let membersExisting = 0

    await db.transaction(async (trx) => {
      const category = await this.ensureCategory(tenant, trx)

      for (const data of DEMO_BOOKS) {
        const { created } = await this.ensureBook(tenant, category.id, data, trx)
        if (created) booksCreated++
        else booksExisting++
      }

      for (const data of DEMO_MEMBERS) {
        const { created } = await this.ensureMember(tenant, data, admin?.id ?? null, trx)
        if (created) membersCreated++
        else membersExisting++
      }
    })

    const indexer = new SearchIndexerService()
    const stats = await indexer.reindexTenant(tenant.id)

    console.log(`[members-books] Tenant: ${tenant.slug}`)
    console.log(
      `[members-books] Books: ${booksCreated} created, ${booksExisting} already present (${DEMO_BOOKS.length} total)`
    )
    console.log(
      `[members-books] Members: ${membersCreated} created, ${membersExisting} already present (${DEMO_MEMBERS.length} total)`
    )
    console.log(
      `[members-books] Search index: ${stats.books} books, ${stats.members} members, ${stats.transactions} transactions`
    )
    console.log('[members-books] Try searching: Maria, Elena, Hobbit, Clean Code')
  }

  private async resolveTenant() {
    const slug = (env.get('DEFAULT_TENANT_SLUG') ?? 'ulmis').toLowerCase()
    const preferred = await Tenant.findBy('slug', slug)
    if (preferred) return preferred

    const demo = await Tenant.findBy('slug', 'demo')
    if (demo) return demo

    return Tenant.query().where('status', 'active').orderBy('created_at', 'asc').first()
  }

  private async ensureCategory(tenant: Tenant, trx: TransactionClientContract) {
    let category = await Category.query({ client: trx })
      .where('tenant_id', tenant.id)
      .where('slug', 'general')
      .first()

    if (!category) {
      category = await Category.query({ client: trx })
        .where('tenant_id', tenant.id)
        .where('slug', 'fiction')
        .first()
    }

    if (!category) {
      category = await Category.create(
        {
          tenantId: tenant.id,
          name: 'General',
          slug: 'general',
        },
        { client: trx }
      )
    }

    return category
  }

  private async ensureBook(
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

    let created = false
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
      created = true
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
          barcode: `SEED-${book.id.slice(0, 4).toUpperCase()}-${String(i).padStart(3, '0')}`,
          copyNumber: i,
          status: 'available',
          shelfLocation: `A-${i}`,
          condition: 'good',
        },
        { client: trx }
      )
    }

    return { book, created }
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
      return { member, created: false }
    }

    const count = await Member.query({ client: trx })
      .where('tenant_id', tenant.id)
      .count('* as total')
      .first()
    const card = generateLibraryCardNumber(tenant.id, Number(count?.$extras.total ?? 0) + 1)
    const approved = data.membershipStatus === 'approved'

    member = await Member.create(
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

    return { member, created: true }
  }
}
