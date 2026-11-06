import axios from 'axios'
import { attachAxiosHttpNotifications } from '@wmsu/ui'
import { useOpacSessionStore } from '@/stores/opac-session-store'

export const opacHttp = axios.create({
  headers: { Accept: 'application/json' },
})

opacHttp.interceptors.request.use((config) => {
  const token = useOpacSessionStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

attachAxiosHttpNotifications(opacHttp)
