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
    status: 'stub',
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
    status: 'stub',
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
    status: 'stub',
    unresolved: ['Create charge vs advisory block'],
  },
  {
    code: 'INT-LIB-06',
    sourceSystem: 'UFMS Cashiering',
    targetSystem: 'ULMIS',
    dataExchanged: 'Payment confirmation for library fines',
    direction: 'in',
    trigger: 'Payment posted',
    mechanism: 'M2M reconcile job + outbox',
    ownership: 'UFMS owns payment; ULMIS updates fine balance',
    status: 'stub',
    unresolved: ['Webhook vs pull reconcile'],
  },
  {
    code: 'INT-LIB-07',
    sourceSystem: 'ULMIS',
    targetSystem: 'UFMS procurement',
    dataExchanged: 'Acquisition / purchase request',
    direction: 'out',
    trigger: 'Patron/staff request (LIB-008)',
    mechanism: 'Outbox enqueue + integrations:outbox-dispatch worker',
    ownership: 'ULMIS owns acquisition_requests; UFMS owns purchase requisitions/orders',
    status: 'stub',
    unresolved: [
      'UFMS intake endpoint + office/fund mapping',
      'Callback to set ufms_pr_ref automatically',
    ],
  },
  {
    code: 'INT-LIB-11',
    sourceSystem: 'ULMIS',
    targetSystem: 'SMTP / SMS providers',
    dataExchanged: 'Notices and scheduled report delivery',
    direction: 'out',
    trigger: 'Events and cron',
    mechanism: 'BullMQ + notifications:send-scheduled; SMTP/EmailJS/PhilSMS',
    ownership: 'ULMIS owns templates and logs',
    status: 'stub',
    unresolved: ['Production provider credentials'],
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
