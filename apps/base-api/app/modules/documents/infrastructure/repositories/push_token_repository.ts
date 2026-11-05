import UserPushToken from '#modules/documents/models/user_push_token'
import { tenantContext } from '#modules/documents/domain/tenant_context'

export class PushTokenRepository {
  async upsert(data: {
    tenantId: string
    userId: string
    token: string
    platform: string
  }): Promise<UserPushToken> {
    const existing = await UserPushToken.query()
      .where('user_id', data.userId)
      .where('token', data.token)
      .first()

    if (existing) {
      existing.platform = data.platform
      await existing.save()
      return existing
    }

    return UserPushToken.create(data)
  }

  async listForUser(userId: string, tenantId?: string): Promise<UserPushToken[]> {
    const query = UserPushToken.query().where('user_id', userId)
    const scopedTenantId = tenantId ?? tenantContext.getTenantId()
    if (scopedTenantId) {
      query.where('tenant_id', scopedTenantId)
    }
    return query
  }

  async deleteToken(userId: string, token: string): Promise<void> {
    await UserPushToken.query().where('user_id', userId).where('token', token).delete()
  }
}

export const pushTokenRepository = new PushTokenRepository()
