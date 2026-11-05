import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

async function passthrough(_ctx: HttpContext, next: NextFn) {
  return next()
}

export const authThrottle = passthrough
export const loginThrottle = passthrough
export const passwordResetThrottle = passthrough
export const apiThrottle = passthrough
export const publicTrackThrottle = passthrough
export const uploadThrottle = passthrough
