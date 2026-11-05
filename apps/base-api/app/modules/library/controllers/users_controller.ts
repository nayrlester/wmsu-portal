import type { HttpContext } from '@adonisjs/core/http'
import UserService from '#modules/library/services/users/user_service'
import RbacService from '#modules/library/services/auth/rbac_service'
import ForbiddenException from '#modules/library/exceptions/forbidden_exception'
import { inviteUserValidator, updateUserValidator } from '#modules/library/validators/auth'

export default class UsersController {
  private userService = new UserService()
  private rbacService = new RbacService()

  private ensurePermission(ctx: HttpContext, permission: string) {
    if (!ctx.authUser || !this.rbacService.hasPermission(ctx.authUser.permissions, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`)
    }
  }

  async index(ctx: HttpContext) {
    this.ensurePermission(ctx, 'users:read')
    const { request, response } = ctx
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 25)

    const users = await this.userService.list(page, perPage)

    return response.ok({
      success: true,
      data: users.all().map((u) => this.userService.serializeUser(u)),
      meta: {
        page: users.currentPage,
        perPage: users.perPage,
        total: users.total,
        totalPages: users.lastPage,
      },
    })
  }

  async store(ctx: HttpContext) {
    this.ensurePermission(ctx, 'users:create')
    const { request, response, authUser } = ctx
    const payload = await request.validateUsing(inviteUserValidator)

    try {
      const user = await this.userService.invite({
        ...payload,
        assignedBy: authUser!.id,
      })

      return response.created({
        success: true,
        message: 'User invited successfully',
        data: this.userService.serializeUser(user),
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return response.conflict({
          success: false,
          message: error.message,
          code: 'USER_EXISTS',
        })
      }
      throw error
    }
  }

  async update(ctx: HttpContext) {
    this.ensurePermission(ctx, 'users:update')
    const { request, response, params } = ctx
    const payload = await request.validateUsing(updateUserValidator)
    const user = await this.userService.update(params.id, payload)

    return response.ok({
      success: true,
      message: 'User updated',
      data: this.userService.serializeUser(user),
    })
  }

  async show(ctx: HttpContext) {
    this.ensurePermission(ctx, 'users:read')
    const { response, params } = ctx
    const user = await this.userService.getById(params.id)
    return response.ok({
      success: true,
      data: this.userService.serializeUser(user),
    })
  }
}
