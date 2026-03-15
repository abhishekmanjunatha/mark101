'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { BasicProfileInput } from '@/lib/validations/onboarding'
import type { ProfessionalInput } from '@/lib/validations/onboarding'
import type { PracticeInput } from '@/lib/validations/onboarding'
import type { AvailabilityInput } from '@/lib/validations/onboarding'

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

// ─── Step 1: Basic Profile ───────────────────────────────────────────────────

export async function saveBasicProfile(data: BasicProfileInput) {
  const { supabase, user } = await getAuthUser()

  const { data: current } = await supabase
    .from('dietitians')
    .select('onboarding_step')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('dietitians')
    .update({
      full_name: data.full_name,
      phone: data.phone,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      primary_practice_location: data.primary_practice_location,
      short_bio: data.short_bio || null,
      photo_url: data.photo_url || null,
      onboarding_step: Math.max(current?.onboarding_step ?? 0, 1),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Step 2: Professional Details ───────────────────────────────────────────

export async function saveProfessionalDetails(data: ProfessionalInput) {
  const { supabase, user } = await getAuthUser()

  const { data: current } = await supabase
    .from('dietitians')
    .select('onboarding_step')
    .eq('id', user.id)
    .single()

  const { error: upsertError } = await supabase.from('dietitian_professional').upsert(
    {
      dietitian_id: user.id,
      primary_qualification: data.primary_qualification,
      additional_certifications: (data.additional_certifications ?? []).filter(Boolean),
      years_of_experience: data.years_of_experience,
      specializations: data.specializations,
      registration_number: data.registration_number || null,
      education: data.education,
    },
    { onConflict: 'dietitian_id' }
  )

  if (upsertError) return { error: upsertError.message }

  await supabase
    .from('dietitians')
    .update({ onboarding_step: Math.max(current?.onboarding_step ?? 0, 2) })
    .eq('id', user.id)

  return { success: true }
}

// ─── Step 3: Practice Details ────────────────────────────────────────────────

export async function savePracticeDetails(data: PracticeInput) {
  const { supabase, user } = await getAuthUser()

  const { data: current } = await supabase
    .from('dietitians')
    .select('onboarding_step')
    .eq('id', user.id)
    .single()

  const { error: upsertError } = await supabase.from('dietitian_practice').upsert(
    {
      dietitian_id: user.id,
      practice_type: data.practice_type,
      clinic_name: data.clinic_name || null,
      practice_address: data.practice_address || null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      online_consultation_fee: data.online_consultation_fee ?? 0,
      clinic_consultation_fee: data.clinic_consultation_fee ?? 0,
      consultation_duration: data.consultation_duration,
      languages: data.languages,
    },
    { onConflict: 'dietitian_id' }
  )

  if (upsertError) return { error: upsertError.message }

  await supabase
    .from('dietitians')
    .update({ onboarding_step: Math.max(current?.onboarding_step ?? 0, 3) })
    .eq('id', user.id)

  return { success: true }
}

// ─── Step 4: Availability ────────────────────────────────────────────────────

export async function saveAvailability(data: AvailabilityInput) {
  const { supabase, user } = await getAuthUser()

  // Delete existing rows and re-insert (clean upsert by dietitian+day)
  const rows = data.days.map((d) => ({
    dietitian_id: user.id,
    day_of_week: d.day,
    is_available: d.is_available,
    time_slots: d.time_slots,
    slot_duration: data.slot_duration,
    buffer_time: data.buffer_time,
  }))

  const { error } = await supabase.from('dietitian_availability').upsert(rows, {
    onConflict: 'dietitian_id,day_of_week',
  })

  if (error) return { error: error.message }

  const { data: current } = await supabase
    .from('dietitians')
    .select('onboarding_step')
    .eq('id', user.id)
    .single()

  await supabase
    .from('dietitians')
    .update({ onboarding_step: Math.max(current?.onboarding_step ?? 0, 4) })
    .eq('id', user.id)

  return { success: true }
}

// ─── Complete Onboarding ─────────────────────────────────────────────────────

export async function completeOnboarding() {
  const { supabase, user } = await getAuthUser()

  const { error } = await supabase
    .from('dietitians')
    .update({ onboarding_complete: true, onboarding_step: 4 })
    .eq('id', user.id)

  if (error) return { error: error.message }
  redirect('/dashboard')
}

// ─── Get onboarding data (for pre-filling & complete screen) ─────────────────

export async function getOnboardingData() {
  const { supabase, user } = await getAuthUser()

  const [dietitianResult, professionalResult, practiceResult] = await Promise.all([
    supabase.from('dietitians').select('*').eq('id', user.id).single(),
    supabase.from('dietitian_professional').select('*').eq('dietitian_id', user.id).single(),
    supabase.from('dietitian_practice').select('*').eq('dietitian_id', user.id).single(),
  ])

  return {
    dietitian: dietitianResult.data,
    professional: professionalResult.data,
    practice: practiceResult.data,
  }
}

export async function getAvailabilityData() {
  const { supabase, user } = await getAuthUser()
  const { data } = await supabase
    .from('dietitian_availability')
    .select('*')
    .eq('dietitian_id', user.id)
    .order('day_of_week')
  return data
}
