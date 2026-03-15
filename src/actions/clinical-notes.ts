'use server'

import { createClient } from '@/lib/supabase/server'
import type { Tables, Json } from '@/types/database'
import type { CreateClinicalNoteInput } from '@/lib/validations/clinical-note'
import { createClinicalNoteSchema } from '@/lib/validations/clinical-note'

// ── Get clinical notes (for a patient, or all) ──────────────────────────────

export async function getClinicalNotes(
  patientId?: string
): Promise<Tables<'clinical_notes'>[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('clinical_notes')
    .select('*')
    .eq('dietitian_id', user.id)
    .order('created_at', { ascending: false })

  if (patientId) {
    query = query.eq('patient_id', patientId)
  }

  const { data } = await query
  return (data as Tables<'clinical_notes'>[] | null) ?? []
}

// ── Get a single clinical note ──────────────────────────────────────────────

export async function getClinicalNote(
  noteId: string
): Promise<Tables<'clinical_notes'> | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('id', noteId)
    .eq('dietitian_id', user.id)
    .single()

  return (data as Tables<'clinical_notes'> | null) ?? null
}

// ── Create clinical note ────────────────────────────────────────────────────

export async function createClinicalNote(
  input: CreateClinicalNoteInput
): Promise<{ noteId?: string; error?: string }> {
  const parsed = createClinicalNoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({
      dietitian_id: user.id,
      patient_id: parsed.data.patient_id,
      document_type: parsed.data.document_type,
      title: parsed.data.title,
      content: parsed.data.blocks as unknown as Json,
      version: 1,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to create clinical note' }
  }

  const noteId = (data as { id: string }).id

  // Add timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: parsed.data.patient_id,
    event_type: 'clinical_document_created',
    event_data: {
      title: parsed.data.title,
      document_type: parsed.data.document_type,
    } as unknown as Json,
    reference_id: noteId,
  })

  return { noteId }
}

// ── Update clinical note ────────────────────────────────────────────────────

export async function updateClinicalNote(
  noteId: string,
  input: CreateClinicalNoteInput
): Promise<{ error?: string }> {
  const parsed = createClinicalNoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get current version
  const { data: current } = await supabase
    .from('clinical_notes')
    .select('version')
    .eq('id', noteId)
    .eq('dietitian_id', user.id)
    .single()

  const currentVersion = (current as { version: number } | null)?.version ?? 0

  const { error } = await supabase
    .from('clinical_notes')
    .update({
      document_type: parsed.data.document_type,
      title: parsed.data.title,
      content: parsed.data.blocks as unknown as Json,
      version: currentVersion + 1,
    })
    .eq('id', noteId)
    .eq('dietitian_id', user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

// ── Delete clinical note ────────────────────────────────────────────────────

export async function deleteClinicalNote(
  noteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('clinical_notes')
    .delete()
    .eq('id', noteId)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }
  return {}
}
