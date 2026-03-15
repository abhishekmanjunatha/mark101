'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Leaf, Mail, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { resendVerificationEmail } from '@/actions/auth'

const RESEND_COOLDOWN = 30

export function VerifyEmailContent({ email }: { email?: string }) {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [isContinuing, setIsContinuing] = useState(false)

  // Poll every 4s to detect email confirmation
  useEffect(() => {
    const supabase = createClient()

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) setIsVerified(true)
    }

    check()
    const interval = setInterval(check, 4000)
    return () => clearInterval(interval)
  }, [])

  // Countdown for resend button
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending) return
    setIsResending(true)
    const result = await resendVerificationEmail(email)
    setIsResending(false)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Verification email resent!')
      setCooldown(RESEND_COOLDOWN)
    }
  }

  const handleContinue = () => {
    setIsContinuing(true)
    router.push('/onboarding')
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

      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
        {/* Icon + Title */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            {isVerified ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                <Mail className="h-7 w-7 text-blue-500" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">Verify Your Email</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We&apos;ve sent a verification link to your registered email address.
              Please verify to activate your dietitian account.
            </p>
          </div>
          {email && (
            <div className="rounded-lg bg-muted px-4 py-2.5 text-sm">
              Verification email sent to:{' '}
              <span className="font-medium text-foreground">{email}</span>
            </div>
          )}
        </div>

        {/* Verification status */}
        <div
          className={`flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm ${
            isVerified
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isVerified ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          )}
          {isVerified ? 'Email successfully verified' : 'Waiting for email verification…'}
        </div>

        {/* Continue */}
        <Button
          className="w-full"
          disabled={!isVerified || isContinuing}
          onClick={handleContinue}
        >
          {isContinuing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting…
            </>
          ) : (
            'Continue to Onboarding'
          )}
        </Button>

        {/* Resend */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending || !email}
          >
            {isResending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Sending…
              </>
            ) : cooldown > 0 ? (
              <>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Resend in {cooldown}s
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>
        </div>

        {/* Edit email */}
        <p className="text-center text-xs text-muted-foreground">
          Wrong email?{' '}
          <Link
            href="/login"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Go back and edit
          </Link>
        </p>

        {/* Help tips */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Didn&apos;t receive the email?</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Check your spam or junk folder</li>
            <li>Ensure you entered the correct email address</li>
            <li>Wait a few minutes before requesting a new email</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
