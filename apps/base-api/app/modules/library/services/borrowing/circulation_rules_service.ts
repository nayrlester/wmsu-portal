import UlmisSettingsService from '#modules/library/services/ulmis/ulmis_settings_service'
import {
  BORROWING_DEFAULTS,
  CIRCULATION_RULES_SETTING_KEY,
  normalizeCirculationRules,
  type CirculationLoanRules,
} from '#modules/library/services/borrowing/borrowing_settings'

export default class CirculationRulesService {
  private settings = new UlmisSettingsService()

  async getRules(): Promise<CirculationLoanRules> {
    const row = await this.settings.get(CIRCULATION_RULES_SETTING_KEY)
    if (!row) {
      return normalizeCirculationRules({ ...BORROWING_DEFAULTS })
    }
    return normalizeCirculationRules(row.settingValue as Record<string, unknown>)
  }

  async ensureSeeded(actorUserId: string | null = null) {
    const existing = await this.settings.get(CIRCULATION_RULES_SETTING_KEY)
    if (existing) return normalizeCirculationRules(existing.settingValue as Record<string, unknown>)

    const row = await this.settings.upsert(
      CIRCULATION_RULES_SETTING_KEY,
      { ...BORROWING_DEFAULTS },
      BORROWING_DEFAULTS.policyNote,
      actorUserId
    )
    return normalizeCirculationRules(row.settingValue as Record<string, unknown>)
  }
}
