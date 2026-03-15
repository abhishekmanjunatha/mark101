'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import type { CreatePatientInput, UpdatePatientInput } from '@/lib/validations/patient'

// ── Patient code generator ──────────────────────────────────────────────────
function generatePatientCode(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `PT-${ts}${rand}`
}

// ── Get all patients for the logged-in dietitian ────────────────────────────
export async function getPatients(search?: string): Promise<Tables<'patients'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('patients')
    .select('*')
    .eq('dietitian_id', user.id)

  if (search?.trim()) {
    const term = search.trim()
    query = query.or(
      `full_name.ilike.%${term}%,patient_code.ilike.%${term}%,phone.ilike.%${term}%`
    )
  }

  const { data } = await query.order('last_visit_at', {
    ascending: false,
    nullsFirst: false,
  })

  return (data as Tables<'patients'>[] | null) ?? []
}

// ── Get a single patient (verifies ownership) ───────────────────────────────
export async function getPatient(
  id: string
): Promise<Tables<'patients'> | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('dietitian_id', user.id)
    .single()

  return (data as Tables<'patients'> | null)
}

// Alias for backward compat
export const getPatientById = getPatient

// ── Create patient ──────────────────────────────────────────────────────────
export async function createPatient(
  input: CreatePatientInput
): Promise<{ error?: string; patientId?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Ensure unique patient_code (retry up to 3 times)
  let patient_code = generatePatientCode()
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_code', patient_code)
      .maybeSingle()
    if (!existing) break
    patient_code = generatePatientCode()
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({
      dietitian_id: user.id,
      patient_code,
      full_name: input.full_name,
      phone: input.phone,
      gender: input.gender ?? null,
      date_of_birth: input.date_of_birth || null,
      height_cm: input.height_cm ?? null,
      weight_kg: input.weight_kg ?? null,
      activity_level: input.activity_level ?? null,
      sleep_hours: input.sleep_hours ?? null,
      work_type: input.work_type ?? null,
      dietary_type: input.dietary_type ?? null,
      medical_conditions: input.medical_conditions ?? [],
      food_allergies: input.food_allergies ?? [],
      primary_goal: input.primary_goal ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const newId = (data as { id: string }).id

  // Create timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: newId,
    event_type: 'note_added',
    event_data: { note: 'Patient record created' },
  })

  revalidatePath('/patients')
  return { patientId: newId }
}

// ── Update patient ──────────────────────────────────────────────────────────
export async function updatePatient(
  id: string,
  input: UpdatePatientInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('patients')
    .update({
      ...input,
      date_of_birth: input.date_of_birth || null,
    })
    .eq('id', id)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return {}
}

// ── Get patient appointments ────────────────────────────────────────────────
export async function getPatientAppointments(patientId: string): Promise<Tables<'appointments'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('appointment_date', { ascending: false })

  return (data as Tables<'appointments'>[] | null) ?? []
}

// ── Get patient clinical notes ──────────────────────────────────────────────
export async function getPatientClinicalNotes(patientId: string): Promise<Tables<'clinical_notes'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  return (data as Tables<'clinical_notes'>[] | null) ?? []
}

// ── Get patient lab reports ─────────────────────────────────────────────────
export async function getPatientLabReports(patientId: string): Promise<Tables<'lab_reports'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('lab_reports')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  return (data as Tables<'lab_reports'>[] | null) ?? []
}

// ── Get patient timeline ────────────────────────────────────────────────────
export async function getPatientTimeline(patientId: string): Promise<Tables<'timeline_events'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('patient_id', patientId)
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data as Tables<'timeline_events'>[] | null) ?? []
}

// ── Delete patient ──────────────────────────────────────────────────────────
export async function deletePatient(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/patients')
  redirect('/patients')
}
