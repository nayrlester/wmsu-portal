type LogoutHandler = () => void

let logoutHandler: LogoutHandler = () => {
  window.location.href = '/login'
}

export const sessionManager = {
  registerLogoutHandler(handler: LogoutHandler): void {
    logoutHandler = handler
  },

  forceLogout(): void {
    logoutHandler()
  },
}
