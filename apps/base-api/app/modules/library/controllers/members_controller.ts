import type { HttpContext } from '@adonisjs/core/http'
import MemberService from '#modules/library/services/members/member_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { tenantContext } from '#modules/library/services/tenant/tenant_context'
import { buildQrPayload } from '#modules/library/services/members/member_helpers'
import {
  createMemberValidator,
  updateMemberValidator,
  listMembersValidator,
  rejectMemberValidator,
} from '#modules/library/validators/member'

function auditFromCtx(ctx: HttpContext) {
  return {
    userId: ctx.authUser?.id,
    userEmail: ctx.authUser?.email,
    ipAddress: ctx.request.ip(),
    requestId: ctx.request.header('x-request-id') ?? undefined,
  }
}

export default class MembersController {
  private memberService = new MemberService()
  private rbac = new RbacService()

  private ensure(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbac.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async index(ctx: HttpContext) {
    this.ensure(ctx, 'members:read')
    const filters = await ctx.request.validateUsing(listMembersValidator)
    const paginator = await this.memberService.list(filters)

    return ctx.response.ok({
      success: true,
      data: paginator.all().map((m) => this.memberService.serializeMember(m)),
      meta: {
        page: paginator.currentPage,
        perPage: paginator.perPage,
        total: paginator.total,
        totalPages: paginator.lastPage,
      },
    })
  }

  async pending(ctx: HttpContext) {
    this.ensure(ctx, 'members:approve')
    const count = await this.memberService.pendingCount()
    const paginator = await this.memberService.list({
      membershipStatus: 'pending',
      perPage: 50,
    })

    return ctx.response.ok({
      success: true,
      data: {
        count,
        members: paginator.all().map((m) => this.memberService.serializeMember(m)),
      },
    })
  }

  async show(ctx: HttpContext) {
    this.ensure(ctx, 'members:read')
    const member = await this.memberService.findById(ctx.params.id)
    const history = await this.memberService.getBorrowingHistory(member.id)

    return ctx.response.ok({
      success: true,
      data: {
        ...this.memberService.serializeMember(member),
        borrowingHistory: history,
      },
    })
  }

  async store(ctx: HttpContext) {
    this.ensure(ctx, 'members:create')
    const payload = await ctx.request.validateUsing(createMemberValidator)

    try {
      const member = await this.memberService.create(payload, auditFromCtx(ctx))
      return ctx.response.created({
        success: true,
        message: 'Member created',
        data: this.memberService.serializeMember(member),
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return ctx.response.conflict({
          success: false,
          message: error.message,
          code: 'MEMBER_EXISTS',
        })
      }
      throw error
    }
  }

  async update(ctx: HttpContext) {
    this.ensure(ctx, 'members:update')
    const payload = await ctx.request.validateUsing(updateMemberValidator)

    try {
      const member = await this.memberService.update(ctx.params.id, payload, auditFromCtx(ctx))
      return ctx.response.ok({
        success: true,
        message: 'Member updated',
        data: this.memberService.serializeMember(member),
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return ctx.response.conflict({
          success: false,
          message: error.message,
          code: 'MEMBER_EXISTS',
        })
      }
      throw error
    }
  }

  async destroy(ctx: HttpContext) {
    this.ensure(ctx, 'members:delete')
    await this.memberService.softDelete(ctx.params.id, auditFromCtx(ctx))
    return ctx.response.ok({ success: true, message: 'Member removed', data: null })
  }

  async approve(ctx: HttpContext) {
    this.ensure(ctx, 'members:approve')
    const member = await this.memberService.approve(
      ctx.params.id,
      ctx.authUser!.id,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({
      success: true,
      message: 'Membership approved',
      data: this.memberService.serializeMember(member),
    })
  }

  async reject(ctx: HttpContext) {
    this.ensure(ctx, 'members:approve')
    const { reason } = await ctx.request.validateUsing(rejectMemberValidator)
    const member = await this.memberService.reject(
      ctx.params.id,
      ctx.authUser!.id,
      reason,
      auditFromCtx(ctx)
    )
    return ctx.response.ok({
      success: true,
      message: 'Membership rejected',
      data: this.memberService.serializeMember(member),
    })
  }

  async card(ctx: HttpContext) {
    this.ensure(ctx, 'members:read')
    const member = await this.memberService.findById(ctx.params.id)
    const tenant = tenantContext.get()

    return ctx.response.ok({
      success: true,
      data: {
        memberId: member.id,
        fullName: member.fullName,
        libraryCardNumber: member.libraryCardNumber,
        memberType: member.memberType,
        membershipStatus: member.membershipStatus,
        department: member.department,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        qrPayload: buildQrPayload(tenant.slug, member.libraryCardNumber, member.id),
      },
    })
  }

  async borrowingHistory(ctx: HttpContext) {
    this.ensure(ctx, 'members:read')
    const history = await this.memberService.getBorrowingHistory(ctx.params.id)
    return ctx.response.ok({ success: true, data: history })
  }
}
