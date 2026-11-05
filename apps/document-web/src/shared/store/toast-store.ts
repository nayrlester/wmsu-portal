import Swal from 'sweetalert2'
import type { SweetAlertIcon } from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

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

function iconFor(variant: ToastVariant): SweetAlertIcon {
  if (variant === 'success') return 'success'
  if (variant === 'error') return 'error'
  if (variant === 'warning') return 'warning'
  return 'info'
}

function showToast(title: string, description: string | undefined, variant: ToastVariant, durationMs: number) {
  void Toast.fire({
    icon: iconFor(variant),
    title,
    text: description,
    timer: durationMs,
  })
}

/** Legacy API kept for compatibility; rendering is SweetAlert2 toasts. */
export const useToastStore = {
  getState: () => ({
    toasts: [] as Array<{ id: string }>,
    push: (toast: { title: string; description?: string; variant: ToastVariant; durationMs: number }) => {
      showToast(toast.title, toast.description, toast.variant, toast.durationMs)
    },
    dismiss: (_id: string) => undefined,
  }),
}

export const toast = {
  success(title: string, description?: string) {
    showToast(title, description, 'success', 4000)
  },
  error(title: string, description?: string) {
    showToast(title, description, 'error', 6000)
  },
  info(title: string, description?: string) {
    showToast(title, description, 'default', 4000)
  },
  warning(title: string, description?: string) {
    showToast(title, description, 'warning', 5000)
  },
}
