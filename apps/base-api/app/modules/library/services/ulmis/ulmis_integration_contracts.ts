export type UlmisIntegrationContract = {
  code: string
  sourceSystem: string
  targetSystem: string
  dataExchanged: string
  direction: 'in' | 'out' | 'bidirectional'
  trigger: string
  mechanism: string
  ownership: string
  status: 'planned' | 'stub' | 'active'
  unresolved: string[]
}

export const ULMIS_INTEGRATION_CONTRACTS: UlmisIntegrationContract[] = [
  {
    code: 'INT-LIB-01',
    sourceSystem: 'USiS / ARIS',
    targetSystem: 'ULMIS',
    dataExchanged: 'Student identity keys and eligibility references',
    direction: 'in',
    trigger: 'Scheduled / domain event',
    mechanism: 'REST + Platform student_identity_refs',
    ownership: 'USiS owns academic records; ULMIS owns patron overlay only',
    status: 'planned',
    unresolved: ['ARIS naming vs USiS mapping'],
  },
  {
    code: 'INT-LIB-02',
    sourceSystem: 'HRIS / Platform employee reference',
    targetSystem: 'ULMIS',
    dataExchanged: 'Faculty/staff identity references',
    direction: 'in',
    trigger: 'Scheduled',
    mechanism: 'REST',
    ownership: 'HRIS/MDM owns employees; ULMIS stores refs only',
    status: 'planned',
    unresolved: ['Live HRIS endpoint'],
  },
  {
    code: 'INT-LIB-03',
    sourceSystem: 'Platform Identity',
    targetSystem: 'ULMIS',
    dataExchanged: 'SSO tokens (LDAP/AD/OAuth)',
    direction: 'in',
    trigger: 'Interactive login',
    mechanism: 'AUTH_MODE dual|platform|local',
    ownership: 'Platform owns IdP; no separate ULMIS login system',
    status: 'stub',
    unresolved: ['Campus IdP credentials'],
  },
  {
    code: 'INT-LIB-04',
    sourceSystem: 'ULMIS',
    targetSystem: 'Platform CIS clearance',
    dataExchanged: 'LIBRARY deficiency (unpaid fines / unreturned items)',
    direction: 'out',
    trigger: 'Fine/loan state change',
    mechanism: 'CIS clearance API + Idempotency-Key; outbox row',
    ownership: 'CIS aggregates; ULMIS sources library facts',
    status: 'planned',
    unresolved: ['Exact deficiency payload'],
  },
  {
    code: 'INT-LIB-05',
    sourceSystem: 'ULMIS',
    targetSystem: 'UFMS cashiering',
    dataExchanged: 'Unpaid penalty referral',
    direction: 'out',
    trigger: 'Configurable',
    mechanism: 'M2M + outbox',
    ownership: 'UFMS owns receivable/OR; ULMIS owns assessed fine',
    status: 'planned',
    unresolved: ['Create charge vs advisory block'],
  },
  {
    code: 'INT-LIB-07',
    sourceSystem: 'ULMIS',
    targetSystem: 'UFMS procurement',
    dataExchanged: 'Acquisition / purchase request',
    direction: 'out',
    trigger: 'Patron/staff request (LIB-008)',
    mechanism: 'Outbox enqueue (Prompt 05); live UFMS PR create deferred',
    ownership: 'ULMIS owns acquisition_requests; UFMS owns purchase requisitions/orders',
    status: 'stub',
    unresolved: [
      'UFMS intake endpoint + office/fund mapping',
      'Callback to set ufms_pr_ref automatically',
    ],
  },
]

export default class UlmisIntegrationContractService {
  listContracts() {
    return ULMIS_INTEGRATION_CONTRACTS
  }

  getContract(code: string) {
    return ULMIS_INTEGRATION_CONTRACTS.find((c) => c.code === code) ?? null
  }
}
