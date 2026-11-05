import type { HttpContext } from '@adonisjs/core/http'
import { readFileSync } from 'node:fs'
import app from '@adonisjs/core/services/app'

export default class DocsController {
  async openapi({ response }: HttpContext) {
    const spec = readFileSync(app.makePath('docs/openapi.yaml'), 'utf-8')
    response.header('Content-Type', 'application/yaml')
    return response.send(spec)
  }

  async swagger({ response }: HttpContext) {
    return response.header('Content-Type', 'text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UIMS API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      persistAuthorization: true,
    })
  </script>
</body>
</html>`)
  }
}
