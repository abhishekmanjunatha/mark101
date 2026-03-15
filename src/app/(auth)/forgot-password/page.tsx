'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Leaf, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth'
import { resetPassword } from '@/actions/auth'

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = (data: ForgotPasswordInput) => {
    startTransition(async () => {
      const result = await resetPassword(data.email)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      setSent(true)
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
        {sent ? (
          <div className="space-y-4 text-center py-2">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We&apos;ve sent a password reset link to{' '}
                <span className="font-medium text-foreground">{getValues('email')}</span>.
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full mt-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Reset your password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your registered email and we&apos;ll send a reset link.
              </p>
            </div>

            {errors.root && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fpw-email">Email Address</Label>
              <Input
                id="fpw-email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Sending link…' : 'Send Reset Link'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline underline-offset-2"
              >
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

