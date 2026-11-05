import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notifySignInError, useNotification } from '@wmsu/ui'
import { login, mapUser } from '@/features/auth/api/auth-api'
import { getApiErrorMessage } from '@/lib/api-client'
import { resolveHomePath } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { notify } = useNotification()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: LoginForm) => login(values.email, values.password),
    onSuccess: (response) => {
      const d = response.data
      const tokens = d.tokens ?? d
      const user = mapUser(d.user ?? {}, d.permissions ?? [])
      setAuth(user, tokens.accessToken, tokens.refreshToken, 'local')
      navigate(resolveHomePath(user.permissions, user.roles))
    },
    onError: (err) => {
      notifySignInError(
        notify,
        getApiErrorMessage(err, 'Login failed. Check your credentials.')
      )
    },
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))

  return { form, onSubmit, mutation }
}
