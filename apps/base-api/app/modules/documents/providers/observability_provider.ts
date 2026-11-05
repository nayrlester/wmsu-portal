import type { ApplicationService } from '@adonisjs/core/types'
import env from '#start/env'

export default class ObservabilityProvider {
  constructor(protected app: ApplicationService) {}

  register() {}

  async boot() {
    if (env.get('SENTRY_DSN')) {
      const Sentry = await import('@sentry/node')
      Sentry.init({
        dsn: env.get('SENTRY_DSN'),
        environment: env.get('NODE_ENV'),
        tracesSampleRate: env.get('SENTRY_TRACES_SAMPLE_RATE') ?? 0.1,
        release: env.get('APP_VERSION') ?? undefined,
      })
    }
  }

  async ready() {
    const otlpEndpoint = env.get('OTEL_EXPORTER_OTLP_ENDPOINT')
    if (!otlpEndpoint || this.app.getEnvironment() === 'test') {
      return
    }

    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
    const { resourceFromAttributes } = await import('@opentelemetry/resources')
    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions')

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: env.get('OTEL_SERVICE_NAME') ?? 'cdts-api',
        [ATTR_SERVICE_VERSION]: env.get('APP_VERSION') ?? '1.0.0',
      }),
      traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    })

    sdk.start()
    this.app.terminating(async () => sdk.shutdown())
  }
}
