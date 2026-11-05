import type { HttpContext } from '@adonisjs/core/http'
import BookService from '#modules/library/services/books/book_service'
import CopyService from '#modules/library/services/books/copy_service'
import BookDigitalFileService from '#modules/library/services/books/book_digital_file_service'
import CatalogVersionService from '#modules/library/services/catalog/catalog_version_service'
import Category from '#modules/library/models/category'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { ULMIS_CLASSIFICATION_SCHEMES, ULMIS_MATERIAL_TYPES } from '#modules/library/domain/ulmis_catalog'
import {
  createBookValidator,
  updateBookValidator,
  listBooksValidator,
  createCopyValidator,
  updateCopyValidator,
  batchBookIdsValidator,
  batchUpdateBooksValidator,
} from '#modules/library/validators/book'
import { tenantId } from '#modules/library/services/books/book_helpers'

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

export default class BooksController {
  private bookService = new BookService()
  private copyService = new CopyService()
  private digitalFiles = new BookDigitalFileService()
  private versionService = new CatalogVersionService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const filters = await ctx.request.validateUsing(listBooksValidator)
    const paginator = await this.bookService.list(filters)

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((book) => this.bookService.serializeBook(book)),
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    })
  }

  async show(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const book = await this.bookService.findById(ctx.params.id)
    const stats = await this.bookService.getInventoryStats(book.id)
    const digitalFiles = await this.digitalFiles.listForBook(book.id)

    return ctx.response.ok({
      success: true,
      data: {
        ...this.bookService.serializeBook(book, stats),
        copies: book.copies.map((c) => this.bookService.serializeCopy(c)),
        digitalFiles: digitalFiles.map((f) => this.digitalFiles.serialize(f)),
      },
    })
  }

  async store(ctx: HttpContext) {
    this.ensure(ctx, 'books:create')
    const payload = await ctx.request.validateUsing(createBookValidator)
    const book = await this.bookService.create(payload, auditFromCtx(ctx))
    const stats = await this.bookService.getInventoryStats(book.id)

    return ctx.response.created({
      success: true,
      message: 'Catalog record created',
      data: {
        ...this.bookService.serializeBook(book, stats),
        copies: book.copies?.map((c) => this.bookService.serializeCopy(c)) ?? [],
      },
    })
  }

  async update(ctx: HttpContext) {
    this.ensure(ctx, 'books:update')
    const payload = await ctx.request.validateUsing(updateBookValidator)
    const book = await this.bookService.update(ctx.params.id, payload, auditFromCtx(ctx))
    const stats = await this.bookService.getInventoryStats(book.id)

    return ctx.response.ok({
      success: true,
      message: 'Catalog record updated',
      data: this.bookService.serializeBook(book, stats),
    })
  }

  async destroy(ctx: HttpContext) {
    this.ensure(ctx, 'books:delete')
    await this.bookService.softDelete(ctx.params.id, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      message: 'Catalog record deleted',
      data: null,
    })
  }

  async batchDestroy(ctx: HttpContext) {
    this.ensure(ctx, 'books:delete')
    const payload = await ctx.request.validateUsing(batchBookIdsValidator)
    const results = await this.bookService.batchSoftDelete(payload.ids, auditFromCtx(ctx))
    return ctx.response.ok({
      success: true,
      message: 'Batch delete completed',
      data: results,
    })
  }

  async batchUpdate(ctx: HttpContext) {
    this.ensure(ctx, 'books:update')
    const payload = await ctx.request.validateUsing(batchUpdateBooksValidator)
    const results = await this.bookService.batchUpdate(payload, auditFromCtx(ctx))
    return ctx.response.ok({
      success: true,
      message: 'Batch update completed',
      data: results,
    })
  }

  async exportMarc(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const marc = await this.bookService.exportMarc(ctx.params.id)
    return ctx.response.ok({
      success: true,
      message: 'MARC export',
      data: marc,
    })
  }

  async versions(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    await this.bookService.findById(ctx.params.id)
    const versions = await this.versionService.listForBook(ctx.params.id)
    return ctx.response.ok({
      success: true,
      data: versions.map((v) => ({
        id: v.id,
        version: v.version,
        snapshot: v.snapshot,
        changedBy: v.changedBy,
        createdAt: v.createdAt.toISO(),
      })),
    })
  }

  async copies(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const copies = await this.copyService.listByBook(ctx.params.id)

    return ctx.response.ok({
      success: true,
      data: copies.map((c) => this.bookService.serializeCopy(c)),
    })
  }

  async addCopy(ctx: HttpContext) {
    this.ensure(ctx, 'books:create')
    const payload = await ctx.request.validateUsing(createCopyValidator)
    const copy = await this.copyService.create(ctx.params.id, payload, auditFromCtx(ctx))

    return ctx.response.created({
      success: true,
      message: 'Copy added',
      data: this.bookService.serializeCopy(copy),
    })
  }

  async updateCopy(ctx: HttpContext) {
    this.ensure(ctx, 'books:update')
    const payload = await ctx.request.validateUsing(updateCopyValidator)
    const copy = await this.copyService.update(ctx.params.copyId, payload, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      message: 'Copy updated',
      data: this.bookService.serializeCopy(copy),
    })
  }

  async destroyCopy(ctx: HttpContext) {
    this.ensure(ctx, 'books:delete')
    await this.copyService.withdraw(ctx.params.copyId, auditFromCtx(ctx))

    return ctx.response.ok({
      success: true,
      message: 'Copy withdrawn',
      data: null,
    })
  }

  async categories(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const categories = await Category.query()
      .where('tenant_id', tenantId())
      .orderBy('name', 'asc')

    return ctx.response.ok({
      success: true,
      data: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    })
  }

  async materialTypes(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    return ctx.response.ok({
      success: true,
      data: {
        materialTypes: ULMIS_MATERIAL_TYPES,
        classificationSchemes: ULMIS_CLASSIFICATION_SCHEMES,
      },
    })
  }

  async listDigitalFiles(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    const files = await this.digitalFiles.listForBook(ctx.params.id)
    return ctx.response.ok({
      success: true,
      data: files.map((f) => this.digitalFiles.serialize(f)),
    })
  }

  async uploadDigitalFile(ctx: HttpContext) {
    this.ensure(ctx, 'books:update')
    const uploadFile = ctx.request.file('file', {
      size: '25mb',
    })
    if (!uploadFile) {
      return ctx.response.badRequest({ success: false, message: 'file is required' })
    }
    if (!ctx.authUser) {
      throw new ForbiddenException('Authentication required')
    }

    try {
      const file = await this.digitalFiles.upload(ctx.params.id, uploadFile, ctx.authUser.id)
      return ctx.response.created({
        success: true,
        message: 'Digital file uploaded to enterprise Document Service',
        data: this.digitalFiles.serialize(file),
      })
    } catch (error) {
      return ctx.response.badRequest({
        success: false,
        message: error instanceof Error ? error.message : 'Digital file upload failed',
      })
    }
  }

  async downloadDigitalFile(ctx: HttpContext) {
    this.ensure(ctx, 'books:read')
    if (!ctx.authUser) {
      throw new ForbiddenException('Authentication required')
    }

    try {
      const result = await this.digitalFiles.getDownload(
        ctx.params.id,
        ctx.params.fileId,
        ctx.authUser.id
      )

      if (result.kind === 'url') {
        return ctx.response.ok({
          success: true,
          data: {
            url: result.url,
            expiresIn: result.expiresIn,
            originalName: result.originalName,
            contentType: result.contentType,
          },
        })
      }

      ctx.response.header('Content-Type', result.contentType)
      ctx.response.header(
        'Content-Disposition',
        `attachment; filename="${result.originalName.replace(/"/g, '')}"`
      )
      return ctx.response.send(Buffer.from(result.body))
    } catch (error) {
      return ctx.response.badRequest({
        success: false,
        message: error instanceof Error ? error.message : 'Digital file download failed',
      })
    }
  }
}
