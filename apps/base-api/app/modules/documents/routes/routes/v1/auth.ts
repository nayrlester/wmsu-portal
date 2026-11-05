import router from '@adonisjs/core/services/router'
import { authThrottle, loginThrottle, passwordResetThrottle } from '#start/limiter'

const AuthController = () => import('#modules/documents/controllers/auth_controller')
const OauthController = () => import('#modules/documents/controllers/oauth_controller')

export function registerAuthRoutes() {
  router
    .group(() => {
      router.post('register', [AuthController, 'register']).use(authThrottle)
      router.post('login', [AuthController, 'login']).use(loginThrottle)
      router.post('mfa/challenge', [AuthController, 'mfaChallenge']).use(loginThrottle)
      router.post('refresh', [AuthController, 'refresh']).use(authThrottle)
      router.post('forgot-password', [AuthController, 'forgotPassword']).use(passwordResetThrottle)
      router.post('reset-password', [AuthController, 'resetPassword']).use(authThrottle)
      router.get('reset-password/validate', [AuthController, 'validateResetToken'])
      router.get('verify-email', [AuthController, 'verifyEmail'])
      router.post('resend-verification', [AuthController, 'resendVerification']).use(authThrottle)

      router.get('oauth/:provider/redirect', [OauthController, 'redirect'])
      router.get('oauth/:provider/callback', [OauthController, 'callback'])
    })
    .prefix('auth')
}
