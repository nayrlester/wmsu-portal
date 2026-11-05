import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

const origins = (env.get('CORS_ORIGINS') ?? 'http://127.0.0.1:5173,http://127.0.0.1:5174')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const corsConfig = defineConfig({
  enabled: true,
  origin: origins,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
