import axios from 'axios'
import { attachAxiosHttpNotifications } from '@wmsu/ui'

const attached = new WeakSet<ReturnType<typeof axios.create>>()

export function createNotifiedAxios(
  config: Parameters<typeof axios.create>[0]
): ReturnType<typeof axios.create> {
  const instance = axios.create(config)
  if (!attached.has(instance)) {
    attachAxiosHttpNotifications(instance)
    attached.add(instance)
  }
  return instance
}
