'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Leaf, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@/lib/validations/auth'
import { signIn, signUp } from '@/actions/auth'

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

function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginInput) => {
    startTransition(async () => {
      const result = await signIn(data.email, data.password)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email Address</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password"
            autoComplete="current-password"
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
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Logging in…' : 'Login'}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>

      <Button
        variant="outline"
        className="w-full opacity-60 cursor-not-allowed"
        disabled
        type="button"
      >
        Login with Phone OTP
        <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
      </Button>
    </form>
  )
}

function RegisterForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const passwordValue = watch('password', '')

  const onSubmit = (data: RegisterInput) => {
    startTransition(async () => {
      const result = await signUp(data.email, data.password, data.fullName)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      toast.success('Account created! Please verify your email.')
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reg-name">Full Name</Label>
        <Input
          id="reg-name"
          type="text"
          placeholder="Enter full name"
          autoComplete="name"
          {...register('fullName')}
        />
        {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email Address</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="Enter email address"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create password"
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
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm">Confirm Password</Label>
        <div className="relative">
          <Input
            id="reg-confirm"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm password"
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

      <div className="flex items-start gap-2.5">
        <Controller
          name="terms"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="terms"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true ? true : false)}
              className="mt-0.5"
            />
          )}
        />
        <Label htmlFor="terms" className="text-sm font-normal leading-snug cursor-pointer">
          I agree to the{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
        </Label>
      </div>
      {errors.terms && <p className="text-xs text-destructive -mt-2">{errors.terms.message}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create Dietitian Account'}
      </Button>
    </form>
  )
}

export function AuthTabs({ initialTab = 'login' }: { initialTab?: string }) {
  return (
    <div className="space-y-6">
      {/* Logo + Tagline */}
      <div className="text-center space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">peepal</span>
        </div>
        <p className="text-sm text-muted-foreground">Your nutrition practice, simplified.</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <Tabs defaultValue={initialTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <LoginForm />
          </TabsContent>

          <TabsContent value="register">
            <RegisterForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
