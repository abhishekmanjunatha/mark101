'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Leaf, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'
import { updatePassword } from '@/actions/auth'

function PasswordStrengthHints({ password }: { password: string }) {
  if (!password) return null
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a–z)', ok: /[a-z]/.test(password) },
    { label: 'One number (0–9)', ok: /[0-9]/.test(password) },
  ]
  return (
    <div className="mt-2 space-y-1">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-1.5 text-xs">
          {c.ok ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <span className={c.ok ? 'text-emerald-600' : 'text-muted-foreground'}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  const passwordValue = watch('password', '')

  const onSubmit = (data: ResetPasswordInput) => {
    startTransition(async () => {
      const result = await updatePassword(data.password)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      toast.success('Password updated successfully!')
      router.push('/dashboard')
    })
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">peepal</span>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Set a new password</h1>
            <p className="text-sm text-muted-foreground">
              Create a strong password for your dietitian account.
            </p>
          </div>

          {errors.root && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create new password"
                autoComplete="new-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthHints password={passwordValue} />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Updating password…' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

