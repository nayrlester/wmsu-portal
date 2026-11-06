import UlmisSettingsService from '#modules/library/services/ulmis/ulmis_settings_service'
import {
  BORROWING_DEFAULTS,
  CIRCULATION_RULES_SETTING_KEY,
  normalizeCirculationRules,
  PATRON_RULE_CATEGORIES,
  type CategoryLoanRule,
  type CirculationLoanRules,
  type PatronRuleCategory,
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

  async getRulesFor(memberType: string | null | undefined): Promise<CirculationLoanRules> {
    const rules = await this.getRules()
    const category = PATRON_RULE_CATEGORIES.find((item) => item === memberType)
    if (!category) return rules
    const override = rules.categories[category]
    return {
      ...rules,
      loanPeriodDays: override.loanPeriodDays,
      renewalPeriodDays: override.renewalPeriodDays,
      maxRenewals: override.maxRenewals,
      maxActiveBorrowings: override.maxActiveBorrowings,
    }
  }

  async saveCategories(
    categories: Partial<Record<PatronRuleCategory, Partial<CategoryLoanRule>>>,
    actorUserId: string | null
  ) {
    const current = await this.ensureSeeded(actorUserId)
    const next = normalizeCirculationRules({
      ...current,
      categories: {
        ...current.categories,
        ...categories,
      },
    })
    await this.settings.upsert(
      CIRCULATION_RULES_SETTING_KEY,
      next as unknown as Record<string, unknown>,
      next.policyNote ?? null,
      actorUserId
    )
    return next
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
