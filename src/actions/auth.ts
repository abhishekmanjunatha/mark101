'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { success: true }
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/onboarding`,
    },
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { success: true }
}

export async function resendVerificationEmail(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/onboarding`,
    },
  })
  if (error) return { error: error.message }
  return { success: true }
}
