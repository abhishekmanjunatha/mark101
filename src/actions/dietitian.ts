'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import type { Json } from '@/types/database'

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

// ─── Get full profile data ───────────────────────────────────────────────────

export async function getDietitianProfile() {
  const { supabase, user } = await getAuthUser()

  const [dietitianRes, professionalRes, practiceRes, availabilityRes] = await Promise.all([
    supabase.from('dietitians').select('*').eq('id', user.id).single(),
    supabase.from('dietitian_professional').select('*').eq('dietitian_id', user.id).single(),
    supabase.from('dietitian_practice').select('*').eq('dietitian_id', user.id).single(),
    supabase.from('dietitian_availability').select('*').eq('dietitian_id', user.id).order('day_of_week'),
  ])

  return {
    dietitian: dietitianRes.data as Tables<'dietitians'> | null,
    professional: professionalRes.data as Tables<'dietitian_professional'> | null,
    practice: practiceRes.data as Tables<'dietitian_practice'> | null,
    availability: (availabilityRes.data ?? []) as Tables<'dietitian_availability'>[],
    email: user.email ?? '',
  }
}

// ─── Update basic info ───────────────────────────────────────────────────────

export async function updateBasicInfo(data: {
  full_name: string
  phone: string
  date_of_birth: string
  gender: 'male' | 'female' | 'prefer_not_to_say' | 'other'
  primary_practice_location: string
  short_bio?: string
  photo_url?: string
}) {
  const { supabase, user } = await getAuthUser()

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
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Update professional details ─────────────────────────────────────────────

export async function updateProfessionalDetails(data: {
  primary_qualification: string
  additional_certifications: string[]
  years_of_experience: '0-1' | '1-3' | '3-5' | '5-10' | '10+'
  specializations: string[]
  registration_number?: string
  education: { degree: string; institution: string; graduation_year: string }[]
}) {
  const { supabase, user } = await getAuthUser()

  const { error } = await supabase.from('dietitian_professional').upsert(
    {
      dietitian_id: user.id,
      primary_qualification: data.primary_qualification,
      additional_certifications: data.additional_certifications.filter(Boolean),
      years_of_experience: data.years_of_experience,
      specializations: data.specializations,
      registration_number: data.registration_number || null,
      education: data.education as unknown as Json,
    },
    { onConflict: 'dietitian_id' }
  )

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Update practice details ─────────────────────────────────────────────────

export async function updatePracticeDetails(data: {
  practice_type: 'online_only' | 'clinic_only' | 'both'
  clinic_name?: string
  practice_address?: string
  city: string
  state: string
  pincode: string
  online_consultation_fee: number
  clinic_consultation_fee: number
  consultation_duration: number
  languages: string[]
}) {
  const { supabase, user } = await getAuthUser()

  const { error } = await supabase.from('dietitian_practice').upsert(
    {
      dietitian_id: user.id,
      practice_type: data.practice_type,
      clinic_name: data.clinic_name || null,
      practice_address: data.practice_address || null,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      online_consultation_fee: data.online_consultation_fee,
      clinic_consultation_fee: data.clinic_consultation_fee,
      consultation_duration: data.consultation_duration,
      languages: data.languages,
    },
    { onConflict: 'dietitian_id' }
  )

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Update availability ─────────────────────────────────────────────────────

export async function updateAvailability(data: {
  days: {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
    is_available: boolean
    time_slots: { start: string; end: string }[]
  }[]
  slot_duration: number
  buffer_time: number
}) {
  const { supabase, user } = await getAuthUser()

  const rows = data.days.map((d) => ({
    dietitian_id: user.id,
    day_of_week: d.day,
    is_available: d.is_available,
    time_slots: d.time_slots as unknown as Json,
    slot_duration: data.slot_duration,
    buffer_time: data.buffer_time,
  }))

  const { error } = await supabase.from('dietitian_availability').upsert(rows, {
    onConflict: 'dietitian_id,day_of_week',
  })

  if (error) return { error: error.message }
  return { success: true }
}

// ─── Change password ─────────────────────────────────────────────────────────

export async function changePassword(newPassword: string) {
  const { supabase } = await getAuthUser()

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return { error: error.message }
  return { success: true }
}
