import Swal from 'sweetalert2'
import type { SweetAlertIcon, SweetAlertResult } from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const CONFIRM_COLOR = '#2563eb'
const DANGER_COLOR = '#dc2626'
const CANCEL_COLOR = '#64748b'

export type AlertOptions = {
  title?: string
  message: string
  confirmLabel?: string
  icon?: SweetAlertIcon
}

export type ConfirmOptions = {
  title: string
  description?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'danger'
  tone?: 'danger' | 'default'
}

export type PromptOptions = {
  title: string
  message?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer)
    el.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

export async function swalAlert(options: AlertOptions | string): Promise<void> {
  const normalized = typeof options === 'string' ? { message: options } : options
  await Swal.fire({
    title: normalized.title ?? 'Notice',
    text: normalized.message,
    icon: normalized.icon ?? 'info',
    confirmButtonText: normalized.confirmLabel ?? 'OK',
    confirmButtonColor: CONFIRM_COLOR,
  })
}

export async function swalConfirm(options: ConfirmOptions): Promise<boolean> {
  const isDanger =
    options.tone === 'danger' ||
    options.variant === 'destructive' ||
    options.variant === 'danger'
  const result: SweetAlertResult = await Swal.fire({
    title: options.title,
    text: options.description ?? options.message ?? '',
    icon: isDanger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: options.confirmLabel ?? 'Confirm',
    cancelButtonText: options.cancelLabel ?? 'Cancel',
    confirmButtonColor: isDanger ? DANGER_COLOR : CONFIRM_COLOR,
    cancelButtonColor: CANCEL_COLOR,
    reverseButtons: true,
    focusCancel: isDanger,
  })
  return result.isConfirmed
}

export async function swalPrompt(options: PromptOptions | string): Promise<string | null> {
  const normalized = typeof options === 'string' ? { title: options } : options
  const result = await Swal.fire({
    title: normalized.title,
    text: normalized.message,
    input: 'text',
    inputValue: normalized.defaultValue ?? '',
    inputPlaceholder: normalized.placeholder,
    showCancelButton: true,
    confirmButtonText: normalized.confirmLabel ?? 'Continue',
    cancelButtonText: normalized.cancelLabel ?? 'Cancel',
    confirmButtonColor: CONFIRM_COLOR,
    cancelButtonColor: CANCEL_COLOR,
    reverseButtons: true,
  })
  if (!result.isConfirmed) return null
  return typeof result.value === 'string' ? result.value : null
}

export const toast = {
  success: (message: string) => void Toast.fire({ icon: 'success', title: message }),
  error: (message: string) => void Toast.fire({ icon: 'error', title: message }),
  warning: (message: string) => void Toast.fire({ icon: 'warning', title: message }),
  info: (message: string) => void Toast.fire({ icon: 'info', title: message }),
}
