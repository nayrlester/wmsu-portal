export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WMSU CIS Platform API',
    version: '0.2.0',
    description:
      'Platform infrastructure, Master Data Management, and Common Integration Services. Student academic SoR remains USiS; financial SoR remains UFMS. Clearance policies are configurable and do not invent university rules.',
  },
  servers: [{ url: 'http://127.0.0.1:3500', description: 'Local development' }],
  components: {
    securitySchemes: {
      ServiceApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Service-Api-Key',
      },
      MdmAdminKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-MDM-Admin-Key',
      },
      IdempotencyKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Idempotency-Key',
      },
    },
    schemas: {
      Envelope: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {},
          meta: { type: 'object', additionalProperties: true },
        },
      },
      ClearanceStatus: {
        type: 'string',
        enum: ['Cleared', 'With Deficiency', 'Conditionally Cleared'],
      },
    },
  },
  paths: {
    '/api/v1/health/live': {
      get: { summary: 'Liveness probe', responses: { '200': { description: 'Alive' } } },
    },
    '/api/v1/health': {
      get: {
        summary: 'Readiness (Postgres + Redis)',
        responses: { '200': { description: 'Healthy/degraded' }, '503': { description: 'Down' } },
      },
    },
    '/api/v1/ping': {
      get: { summary: 'Ping + queue job', responses: { '200': { description: 'Pong' } } },
    },
    '/api/v1/mdm/overview': {
      get: {
        summary: 'MDM overview counts and ownership rules',
        responses: { '200': { description: 'Overview payload' } },
      },
    },
    '/api/v1/mdm/universities': {
      get: { summary: 'List universities', responses: { '200': { description: 'University rows' } } },
      post: {
        summary: 'Create university (admin key)',
        security: [{ MdmAdminKey: [] }],
        responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/api/v1/mdm/campuses': {
      get: { summary: 'List campuses', responses: { '200': { description: 'Campus rows' } } },
      post: {
        summary: 'Create campus (admin key)',
        security: [{ MdmAdminKey: [] }],
        responses: {
          '201': { description: 'Created' },
          '401': { description: 'Unauthorized' },
          '409': { description: 'Duplicate code' },
        },
      },
    },
    '/api/v1/mdm/student-identity-refs': {
      get: {
        summary: 'List student identity projections (not USiS academic SoR)',
        responses: { '200': { description: 'Projection rows + ownership note' } },
      },
      post: {
        summary: 'Upsert student identity projection from USiS',
        security: [{ MdmAdminKey: [] }],
        responses: { '200': { description: 'Updated' }, '201': { description: 'Created' } },
      },
    },
    '/api/v1/mdm/number-sequences/{id}/next': {
      post: {
        summary: 'Allocate next sequence value (admin key)',
        security: [{ MdmAdminKey: [] }],
        responses: { '200': { description: 'Formatted value' } },
      },
    },
    '/api/v1/integration/overview': {
      get: {
        summary: 'CIS capabilities and ownership boundaries',
        responses: { '200': { description: 'Overview' } },
      },
    },
    '/api/v1/integration/events': {
      get: {
        summary: 'List recent domain events',
        security: [{ ServiceApiKey: [] }],
        responses: { '200': { description: 'Event rows' } },
      },
      post: {
        summary: 'Publish domain event (idempotent)',
        security: [{ ServiceApiKey: [] }],
        responses: { '200': { description: 'Published or deduplicated' } },
      },
    },
    '/api/v1/integration/subscriptions': {
      get: {
        summary: 'List event subscriptions',
        security: [{ ServiceApiKey: [] }],
        responses: { '200': { description: 'Subscriptions' } },
      },
    },
    '/api/v1/integration/transactions': {
      get: {
        summary: 'Integration transaction logs',
        security: [{ ServiceApiKey: [] }],
        responses: { '200': { description: 'Transaction rows' } },
      },
    },
    '/api/v1/integration/notifications': {
      get: {
        summary: 'List notifications',
        security: [{ ServiceApiKey: [] }],
        responses: { '200': { description: 'Notification rows' } },
      },
      post: {
        summary: 'Enqueue notification (foundation)',
        security: [{ ServiceApiKey: [] }],
        responses: { '200': { description: 'Queued' } },
      },
    },
    '/api/v1/integration/files': {
      post: {
        summary: 'Store file via local storage abstraction (base64 JSON)',
        security: [{ ServiceApiKey: [] }],
        responses: { '201': { description: 'Stored' } },
      },
    },
    '/api/v1/integration/files/{id}': {
      get: {
        summary: 'File metadata',
        security: [{ ServiceApiKey: [] }],
        responses: { '200': { description: 'Metadata' }, '404': { description: 'Missing' } },
      },
    },
    '/api/v1/integration/audit-logs': {
      get: {
        summary: 'Platform audit logs',
        responses: { '200': { description: 'Audit rows' } },
      },
    },
    '/api/v1/integration/clearance/types': {
      get: {
        summary: 'Configurable clearance requirement types',
        responses: { '200': { description: 'Type rows including university-approval flags' } },
      },
    },
    '/api/v1/integration/clearance/requirements': {
      post: {
        summary: 'Upsert clearance requirement from an authorized office system',
        security: [{ ServiceApiKey: [], IdempotencyKey: [] }],
        responses: {
          '200': { description: 'Recorded or idempotent replay' },
          '409': { description: 'Policy pending university approval' },
          '422': { description: 'Invalid status or type' },
        },
      },
    },
    '/api/v1/integration/clearance/{subjectKey}': {
      get: {
        summary: 'Evaluate aggregated clearance status for a subject',
        parameters: [
          { name: 'subjectKey', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'subjectType',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'student' },
          },
        ],
        responses: { '200': { description: 'Overall TOR status + breakdown' } },
      },
    },
    '/api/v1/integration/critical/echo': {
      post: {
        summary:
          'Idempotent critical-transaction foundation echo (no enrollment/finance posting)',
        security: [{ ServiceApiKey: [], IdempotencyKey: [] }],
        responses: {
          '200': { description: 'Accepted' },
          '400': { description: 'Missing Idempotency-Key' },
        },
      },
    },
  },
} as const
