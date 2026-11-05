export type TormsIntegrationContract = {
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

export const TORMS_INTEGRATION_CONTRACTS: TormsIntegrationContract[] = [
  {
    code: 'INT-TOR-01',
    sourceSystem: 'USiS',
    targetSystem: 'TORMS',
    dataExchanged: 'Grades / academic history projection',
    direction: 'in',
    trigger: 'M2M push or pull',
    mechanism: 'X-Service-Api-Key; USiS grades-export + TORMS /internal/grades/sync',
    ownership: 'USiS owns grades SoR; TORMS projection ledger only',
    status: 'stub',
    unresolved: ['Broader TOR-035 entity sync payloads'],
  },
  {
    code: 'INT-TOR-02',
    sourceSystem: 'USiS',
    targetSystem: 'TORMS',
    dataExchanged: 'Student profile, enrollment, program/curriculum',
    direction: 'in',
    trigger: 'Scheduled or event sync',
    mechanism: 'M2M secure API',
    ownership: 'USiS SoR; TORMS references only',
    status: 'planned',
    unresolved: ['Exact export endpoints beyond grades-export'],
  },
  {
    code: 'INT-TOR-03',
    sourceSystem: 'USiS',
    targetSystem: 'TORMS',
    dataExchanged: 'Graduation → alumni profile create',
    direction: 'in',
    trigger: 'Student graduated',
    mechanism: 'POST /api/v1/internal/alumni/from-graduation',
    ownership: 'TORMS owns alumni profile SoR for TOR-named fields',
    status: 'stub',
    unresolved: [],
  },
  {
    code: 'INT-TOR-04',
    sourceSystem: 'USiS',
    targetSystem: 'TORMS',
    dataExchanged: 'ENR-022 correction/history reflection',
    direction: 'in',
    trigger: 'Grade correction approved',
    mechanism: 'M2M / events',
    ownership: 'USiS owns correction workflow; TORMS logs projection',
    status: 'planned',
    unresolved: ['History feed contract'],
  },
  {
    code: 'INT-TOR-05',
    sourceSystem: 'Platform CIS',
    targetSystem: 'TORMS',
    dataExchanged: 'Central clearance status',
    direction: 'in',
    trigger: 'Request clearance gate',
    mechanism: 'GET /api/v1/integrations/clearance/:studentNumber',
    ownership: 'Platform aggregates; TORMS does not compute',
    status: 'stub',
    unresolved: ['Conditionally Cleared campus rules'],
  },
  {
    code: 'INT-TOR-06',
    sourceSystem: 'TORMS',
    targetSystem: 'UFMS',
    dataExchanged: 'Document fee assessment',
    direction: 'out',
    trigger: 'Fee assessment step',
    mechanism: 'M2M (contract pending)',
    ownership: 'UFMS owns fees/OR',
    status: 'planned',
    unresolved: ['UFMS document-fee API field contract', 'Fee schedule amounts'],
  },
  {
    code: 'INT-TOR-07',
    sourceSystem: 'TORMS',
    targetSystem: 'UFMS',
    dataExchanged: 'Payment verification / OR / document-fee balance',
    direction: 'in',
    trigger: 'Payment gate',
    mechanism: 'M2M (contract pending)',
    ownership: 'UFMS owns payment SoR',
    status: 'planned',
    unresolved: ['Payment verify endpoint'],
  },
  {
    code: 'INT-TOR-08',
    sourceSystem: 'TORMS',
    targetSystem: 'UFMS',
    dataExchanged: 'Alumni donation posting',
    direction: 'out',
    trigger: 'Donation recorded',
    mechanism: 'M2M',
    ownership: 'UFMS owns financial posting',
    status: 'planned',
    unresolved: ['Donation posting contract'],
  },
  {
    code: 'INT-TOR-09',
    sourceSystem: 'TORMS',
    targetSystem: 'UDMS',
    dataExchanged: 'TOR/cert/supporting record images',
    direction: 'bidirectional',
    trigger: 'Issuance / attachment',
    mechanism: 'DMS-010 M2M store/retrieve',
    ownership: 'UDMS owns blobs; TORMS owns issuance refs',
    status: 'planned',
    unresolved: ['DMS-010 payload for TORMS'],
  },
  {
    code: 'INT-TOR-10',
    sourceSystem: 'Platform Identity',
    targetSystem: 'TORMS',
    dataExchanged: 'SSO / RBAC / org context',
    direction: 'in',
    trigger: 'Interactive login',
    mechanism: 'AUTH_MODE dual|platform|local',
    ownership: 'Platform owns IdP; no separate TORMS login',
    status: 'active',
    unresolved: [],
  },
  {
    code: 'INT-TOR-11',
    sourceSystem: 'TORMS',
    targetSystem: 'Platform CIS',
    dataExchanged: 'Request progress notifications',
    direction: 'out',
    trigger: 'Status transitions',
    mechanism: 'CIS events / mailer',
    ownership: 'Prefer CIS fan-out',
    status: 'planned',
    unresolved: ['Campus notification templates'],
  },
]

export class TormsIntegrationContractService {
  listContracts() {
    return TORMS_INTEGRATION_CONTRACTS
  }

  getContract(code: string) {
    return TORMS_INTEGRATION_CONTRACTS.find((c) => c.code === code) ?? null
  }
}
