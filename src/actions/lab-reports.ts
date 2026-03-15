'use server'

import { createClient } from '@/lib/supabase/server'
import type { Tables, Json } from '@/types/database'
import { UPLOAD_TOKEN_EXPIRY_HOURS } from '@/lib/constants/app'

// ── Get lab reports (optionally filtered by patient) ────────────────────────

export async function getLabReports(
  patientId?: string
): Promise<(Tables<'lab_reports'> & { patient?: { id: string; full_name: string; patient_code: string } })[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('lab_reports')
    .select('*, patients!inner(id, full_name, patient_code)')
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  if (patientId) {
    query = query.eq('patient_id', patientId)
  }

  const { data } = await query

  return (
    (data as (Tables<'lab_reports'> & {
      patients: { id: string; full_name: string; patient_code: string }
    })[] | null)?.map((r) => ({
      ...r,
      patient: r.patients,
    })) ?? []
  )
}

// ── Get a single lab report ─────────────────────────────────────────────────

export async function getLabReport(
  reportId: string
): Promise<(Tables<'lab_reports'> & { patient?: { id: string; full_name: string; patient_code: string } }) | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('lab_reports')
    .select('*, patients!inner(id, full_name, patient_code)')
    .eq('id', reportId)
    .eq('dietitian_id', user.id)
    .single()

  if (!data) return null

  const row = data as Tables<'lab_reports'> & {
    patients: { id: string; full_name: string; patient_code: string }
  }
  return { ...row, patient: row.patients }
}

// ── Upload lab report (dietitian) ───────────────────────────────────────────

export async function uploadLabReport(input: {
  patient_id: string
  title: string
  report_type?: string
  file_urls: string[]
}): Promise<{ reportId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!input.title.trim()) return { error: 'Report title is required' }
  if (input.file_urls.length === 0) return { error: 'At least one file is required' }

  const { data, error } = await supabase
    .from('lab_reports')
    .insert({
      dietitian_id: user.id,
      patient_id: input.patient_id,
      title: input.title.trim(),
      report_type: (input.report_type as Tables<'lab_reports'>['report_type']) ?? null,
      file_urls: input.file_urls,
      upload_source: 'dietitian' as const,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to upload report' }
  }

  const reportId = (data as { id: string }).id

  // Timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: input.patient_id,
    event_type: 'lab_report_uploaded',
    event_data: {
      title: input.title,
      report_type: input.report_type ?? 'other',
      source: 'dietitian',
    } as unknown as Json,
    reference_id: reportId,
  })

  return { reportId }
}

// ── Generate secure upload token (for patient uploads) ──────────────────────

export async function generateSecureUploadToken(
  patientId: string
): Promise<{ token?: string; expiresAt?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Generate a secure random token
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const expiresAt = new Date(
    Date.now() + UPLOAD_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString()

  // Create a lab_report placeholder row with token
  const { data, error } = await supabase
    .from('lab_reports')
    .insert({
      dietitian_id: user.id,
      patient_id: patientId,
      title: 'Patient Upload (pending)',
      upload_source: 'patient' as const,
      upload_token: token,
      token_expires_at: expiresAt,
      file_urls: [],
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to generate token' }
  }

  return { token, expiresAt }
}

// ── Save AI analysis results ────────────────────────────────────────────────

export async function saveAiAnalysis(
  reportId: string,
  summary: string,
  observations: Record<string, unknown>[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('lab_reports')
    .update({
      ai_summary: summary,
      ai_observations: observations as unknown as Json,
    })
    .eq('id', reportId)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }
  return {}
}

// ── Delete lab report ───────────────────────────────────────────────────────

export async function deleteLabReport(
  reportId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('lab_reports')
    .delete()
    .eq('id', reportId)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }
  return {}
}
