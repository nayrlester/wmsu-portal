import app from '@adonisjs/core/services/app'
import limiter from '@adonisjs/limiter/services/main'

const noLimit = () => limiter.noLimit()!

export const authThrottle = limiter.define('auth', () => {
  return app.inProduction ? limiter.allowRequests(10).every('15 minutes') : noLimit()
})

export const loginThrottle = limiter.define('login', () => {
  return app.inProduction ? limiter.allowRequests(5).every('15 minutes') : noLimit()
})

export const passwordResetThrottle = limiter.define('password_reset', () => {
  return app.inProduction ? limiter.allowRequests(3).every('1 hour') : noLimit()
})

export const apiThrottle = limiter.define('api', () => {
  return app.inProduction ? limiter.allowRequests(120).every('1 minute') : noLimit()
})

export const publicTrackThrottle = limiter.define('public_track', () => {
  return app.inProduction ? limiter.allowRequests(30).every('1 minute') : noLimit()
})

export const uploadThrottle = limiter.define('upload', () => {
  return app.inProduction ? limiter.allowRequests(30).every('1 minute') : noLimit()
})
