import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { useCreateMember, useUpdateMember } from '@/hooks/use-members'
import { useMembersStore } from '@/stores/members-store'
import { getApiErrorMessage } from '@/lib/api-client'
import type { MemberType } from '@/types/members'

const schema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  contact: z.string().optional(),
  department: z.string().optional(),
  memberType: z.enum(['student', 'faculty', 'employee', 'researcher', 'guest']),
  notes: z.string().optional(),
  autoApprove: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

const MEMBER_TYPES: { value: MemberType; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'employee', label: 'Employee' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'guest', label: 'Guest' },
]

export function MemberFormModal() {
  const { isFormOpen, editingMember, closeForm } = useMembersStore()
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      memberType: 'student',
      autoApprove: false,
    },
  })

  useEffect(() => {
    if (isFormOpen) {
      reset(
        editingMember
          ? {
              fullName: editingMember.fullName,
              email: editingMember.email ?? '',
              contact: editingMember.contact ?? '',
              department: editingMember.department ?? '',
              memberType: editingMember.memberType,
              notes: editingMember.notes ?? '',
            }
          : { fullName: '', memberType: 'student', autoApprove: false }
      )
    }
  }, [isFormOpen, editingMember, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          payload: {
            fullName: values.fullName,
            email: values.email || null,
            contact: values.contact || null,
            department: values.department || null,
            memberType: values.memberType,
            notes: values.notes || null,
          },
        })
      } else {
        await createMember.mutateAsync({
          fullName: values.fullName,
          email: values.email || undefined,
          contact: values.contact,
          department: values.department,
          memberType: values.memberType,
          notes: values.notes,
          autoApprove: values.autoApprove,
        })
      }
      closeForm()
    } catch (err) {
      setError('root', { message: getApiErrorMessage(err) })
    }
  }

  return (
    <Dialog
      open={isFormOpen}
      onClose={closeForm}
      title={editingMember ? 'Edit member' : 'Register member'}
      description={
        editingMember
          ? 'Update member profile'
          : 'New members require approval unless auto-approve is enabled'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name *</Label>
          <Input id="fullName" {...register('fullName')} />
          {errors.fullName && (
            <p className="text-sm text-red-600">{errors.fullName.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input id="contact" {...register('contact')} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" {...register('department')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberType">Member type</Label>
            <select
              id="memberType"
              className="flex h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
              {...register('memberType')}
            >
              {MEMBER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!editingMember && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded" {...register('autoApprove')} />
            Auto-approve membership (skip pending queue)
          </label>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            rows={2}
            className="flex w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            {...register('notes')}
          />
        </div>

        {errors.root && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={closeForm}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editingMember ? 'Save' : 'Register'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
