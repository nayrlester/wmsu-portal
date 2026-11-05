import axios from 'axios'
import { attachAxiosHttpNotifications } from '@wmsu/ui'

export const opacHttp = axios.create({
  headers: { Accept: 'application/json' },
})

attachAxiosHttpNotifications(opacHttp)
