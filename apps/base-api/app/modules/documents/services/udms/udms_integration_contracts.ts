export type UdmsIntegrationContract = {
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

/** Planned INT-DMS-* catalog from UDMS_INTEGRATION_DESIGN.md — Prompt 02 exposes read-only; no live dispatch. */
export const UDMS_INTEGRATION_CONTRACTS: UdmsIntegrationContract[] = [
  {
    code: 'INT-DMS-01',
    sourceSystem: 'Platform Identity',
    targetSystem: 'UDMS',
    dataExchanged: 'SSO tokens; user/role claims',
    direction: 'in',
    trigger: 'Interactive login',
    mechanism: 'AUTH_MODE dual|platform|local',
    ownership: 'Platform owns IdP; no separate UDMS login system',
    status: 'stub',
    unresolved: ['Campus IdP credentials'],
  },
  {
    code: 'INT-DMS-02',
    sourceSystem: 'Platform MDM',
    targetSystem: 'UDMS',
    dataExchanged: 'Office/org/campus references',
    direction: 'in',
    trigger: 'On resolve',
    mechanism: 'REST refs',
    ownership: 'MDM owns org chart; UDMS stores refs only',
    status: 'planned',
    unresolved: [],
  },
  {
    code: 'INT-DMS-03',
    sourceSystem: 'Platform Document Hub',
    targetSystem: 'UDMS',
    dataExchanged: 'Binary store/retrieve references',
    direction: 'bidirectional',
    trigger: 'Upload/download',
    mechanism: 'Existing /api/v1/documents hub + platform_documents',
    ownership: 'Hub owns blobs; UDMS owns metadata',
    status: 'active',
    unresolved: ['Archival PDF/A permanence policy'],
  },
  {
    code: 'INT-DMS-04',
    sourceSystem: 'Platform CIS notifications',
    targetSystem: 'Users',
    dataExchanged: 'Workflow/retention alerts',
    direction: 'out',
    trigger: 'Domain events',
    mechanism: 'CIS events / SMTP',
    ownership: 'Prefer CIS fan-out',
    status: 'planned',
    unresolved: ['Campus SMTP/SMS'],
  },
  {
    code: 'INT-DMS-05',
    sourceSystem: 'USiS',
    targetSystem: 'UDMS',
    dataExchanged: 'Student requirement documents (DMS-010)',
    direction: 'bidirectional',
    trigger: 'Enrollment workflows',
    mechanism: 'M2M store/retrieve + outbox for outbound events',
    ownership: 'USiS owns academic; UDMS owns file+meta',
    status: 'planned',
    unresolved: ['Exact payload contract'],
  },
  {
    code: 'INT-DMS-06',
    sourceSystem: 'UFMS',
    targetSystem: 'UDMS',
    dataExchanged: 'Voucher / supporting attachments (DMS-010, FIN-010)',
    direction: 'bidirectional',
    trigger: 'DV/procurement',
    mechanism: 'M2M + outbox',
    ownership: 'UFMS owns financial meaning; UDMS stores files',
    status: 'planned',
    unresolved: ['Exact attachment schema'],
  },
  {
    code: 'INT-DMS-07',
    sourceSystem: 'UIMS',
    targetSystem: 'UDMS',
    dataExchanged: 'Inventory-related documents (DMS-010)',
    direction: 'bidirectional',
    trigger: 'Property workflows',
    mechanism: 'M2M + outbox',
    ownership: 'UIMS owns inventory facts',
    status: 'planned',
    unresolved: ['Exact payload'],
  },
  {
    code: 'INT-DMS-08',
    sourceSystem: 'TORMS',
    targetSystem: 'UDMS',
    dataExchanged: 'Transcript/certification record images (DMS-010)',
    direction: 'bidirectional',
    trigger: 'TOR/cert issuance',
    mechanism: 'M2M + outbox',
    ownership: 'TORMS owns TOR facts; UDMS stores images',
    status: 'planned',
    unresolved: ['Exact image metadata'],
  },
  {
    code: 'INT-DMS-09',
    sourceSystem: 'UDMS',
    targetSystem: 'E-sign provider / pads',
    dataExchanged: 'Signature payloads (DMS-008/024)',
    direction: 'bidirectional',
    trigger: 'Approval',
    mechanism: 'Vendor SDK / PNPKI / HWR-017',
    ownership: 'Provider; UDMS stores signed artifact refs',
    status: 'planned',
    unresolved: ['Vendor vs PNPKI choice'],
  },
  {
    code: 'INT-DMS-10',
    sourceSystem: 'Email gateway',
    targetSystem: 'UDMS',
    dataExchanged: 'Official digital intake (DMS-013)',
    direction: 'in',
    trigger: 'Mail received',
    mechanism: 'Ingest worker + outbox ack',
    ownership: 'UDMS owns registry after ingest',
    status: 'planned',
    unresolved: ['Mailbox ownership'],
  },
  {
    code: 'INT-DMS-11',
    sourceSystem: 'HRIS / employee MDM',
    targetSystem: 'UDMS',
    dataExchanged: 'Employee identity for ESS (DMS-023)',
    direction: 'in',
    trigger: 'Provision',
    mechanism: 'REST refs',
    ownership: 'HRIS/MDM owns employee',
    status: 'planned',
    unresolved: ['Employee personal record package source'],
  },
]

export default class UdmsIntegrationContractService {
  listContracts() {
    return UDMS_INTEGRATION_CONTRACTS
  }

  getContract(code: string) {
    return UDMS_INTEGRATION_CONTRACTS.find((c) => c.code === code) ?? null
  }
}
