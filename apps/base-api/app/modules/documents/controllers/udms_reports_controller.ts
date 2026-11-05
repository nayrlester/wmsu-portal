import type { HttpContext } from '@adonisjs/core/http'
import { udmsReportsService } from '#modules/documents/services/udms/udms_reports_service'
import { udmsReportFiltersValidator } from '#modules/documents/validators/udms_reports'

export default class UdmsReportsController {
  async dashboard({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(udmsReportFiltersValidator, {
      data: request.qs(),
    })
    const payload = await udmsReportsService.getDashboard(auth.user!, filters)
    if (filters.format === 'csv') {
      const csv = udmsReportsService.toCsv('dashboard', payload)
      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header(
        'Content-Disposition',
        `attachment; filename="udms-dashboard-${Date.now()}.csv"`
      )
      return response.send(csv)
    }
    return response.ok(payload)
  }

  async registration({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(udmsReportFiltersValidator, {
      data: request.qs(),
    })
    const payload = await udmsReportsService.getRegistrationReport(auth.user!, filters)
    if (filters.format === 'csv') {
      const csv = udmsReportsService.toCsv('registration', payload)
      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header(
        'Content-Disposition',
        `attachment; filename="udms-registration-${Date.now()}.csv"`
      )
      return response.send(csv)
    }
    return response.ok(payload)
  }

  async workflow({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(udmsReportFiltersValidator, {
      data: request.qs(),
    })
    return response.ok(await udmsReportsService.getWorkflowReport(auth.user!, filters))
  }

  async archival({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(udmsReportFiltersValidator, {
      data: request.qs(),
    })
    const payload = await udmsReportsService.getArchivalReport(auth.user!, filters)
    if (filters.format === 'csv') {
      const csv = udmsReportsService.toCsv('archival', payload)
      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header(
        'Content-Disposition',
        `attachment; filename="udms-archival-${Date.now()}.csv"`
      )
      return response.send(csv)
    }
    return response.ok(payload)
  }

  async printable({ request, auth, response }: HttpContext) {
    const filters = await request.validateUsing(udmsReportFiltersValidator, {
      data: request.qs(),
    })
    const dashboard = await udmsReportsService.getDashboard(auth.user!, filters)
    const html = this.renderPrintable(dashboard)
    response.header('Content-Type', 'text/html; charset=utf-8')
    return response.send(html)
  }

  private renderPrintable(dashboard: Awaited<ReturnType<typeof udmsReportsService.getDashboard>>) {
    const metricsRows = Object.entries(dashboard.metrics)
      .map(
        ([key, value]) =>
          `<tr><td>${this.escape(key)}</td><td>${this.escape(value === null ? 'n/a' : value)}</td></tr>`
      )
      .join('')
    const defsRows = Object.entries(dashboard.metricDefinitions)
      .map(
        ([key, value]) =>
          `<tr><td>${this.escape(key)}</td><td>${this.escape(value)}</td></tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>UDMS Management Dashboard</title>
  <style>
    body { font-family: Georgia, serif; margin: 2rem; color: #111; }
    h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
    .meta { color: #444; margin-bottom: 1.5rem; font-size: 0.9rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
    th { background: #f3f3f3; }
    @media print { body { margin: 0.5rem; } }
  </style>
</head>
<body>
  <h1>UDMS Management Dashboard</h1>
  <p class="meta">Period: ${this.escape(dashboard.period.from)} — ${this.escape(dashboard.period.to)}<br/>
  Generated: ${this.escape(dashboard.generatedAt)}</p>
  <h2>Metrics</h2>
  <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${metricsRows}</tbody></table>
  <h2>Metric definitions</h2>
  <table><thead><tr><th>Key</th><th>Definition</th></tr></thead><tbody>${defsRows}</tbody></table>
  <script>window.addEventListener('load', () => { /* printable view — use browser Print for PDF */ })</script>
</body>
</html>`
  }

  private escape(value: unknown): string {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
  }
}
