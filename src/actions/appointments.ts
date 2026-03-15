'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Tables, Json } from '@/types/database'
import type { CreateAppointmentInput } from '@/lib/validations/appointment'
import type { DayAvailability, SlotDuration, BufferTime } from '@/types/app'
import { generateSlots } from '@/lib/utils/slots'

// ── Type for appointment rows with patient join ─────────────────────────────

export interface AppointmentWithPatient {
  id: string
  dietitian_id: string
  patient_id: string
  purpose: Tables<'appointments'>['purpose']
  custom_purpose: string | null
  mode: Tables<'appointments'>['mode']
  appointment_date: string
  appointment_time: string
  status: Tables<'appointments'>['status']
  notes: string | null
  created_at: string
  updated_at: string
  patient: {
    id: string
    full_name: string
    patient_code: string
    phone: string
  }
}

// ── Get filtered appointments ──────────────────────────────────────────────

export async function getAppointments(
  filter: 'today' | 'upcoming' | 'completed' = 'today'
): Promise<AppointmentWithPatient[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('appointments')
    .select('*, patients(id, full_name, patient_code, phone)')
    .eq('dietitian_id', user.id)

  if (filter === 'today') {
    query = query.eq('appointment_date', today).neq('status', 'cancelled')
  } else if (filter === 'upcoming') {
    query = query.gte('appointment_date', today).eq('status', 'upcoming')
  } else if (filter === 'completed') {
    query = query.eq('status', 'completed')
  }

  const { data, error } = await query.order('appointment_date', { ascending: filter !== 'completed' })
    .order('appointment_time', { ascending: true })

  if (error || !data) return []

  return (data as unknown as Array<
    Omit<AppointmentWithPatient, 'patient'> & {
      patients: AppointmentWithPatient['patient']
    }
  >).map((row) => ({
    ...row,
    patient: row.patients,
  }))
}

// ── Get available slots for a given date ───────────────────────────────────

export async function getAvailableSlots(
  date: string
): Promise<{ slots: string[]; slotDuration: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { slots: [], slotDuration: 30 }

  // Determine day of week from the selected date
  const dayOfWeek = new Date(date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as Tables<'dietitian_availability'>['day_of_week']

  // Fetch dietitian's availability for that day
  const { data: avail } = await supabase
    .from('dietitian_availability')
    .select('*')
    .eq('dietitian_id', user.id)
    .eq('day_of_week', dayOfWeek)
    .single()

  const availability = avail as Tables<'dietitian_availability'> | null

  if (!availability || !availability.is_available) {
    return { slots: [], slotDuration: availability?.slot_duration ?? 30 }
  }

  const timeSlots = (availability.time_slots ?? []) as Array<{ start: string; end: string }>
  const slotDuration = availability.slot_duration as SlotDuration
  const bufferTime = availability.buffer_time as BufferTime

  const dayAvailability: DayAvailability = {
    day: dayOfWeek,
    available: true,
    slots: timeSlots,
  }

  const allSlots = generateSlots(dayAvailability, slotDuration, bufferTime)

  // Fetch existing appointments for that date to exclude booked slots
  const { data: existing } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('dietitian_id', user.id)
    .eq('appointment_date', date)
    .neq('status', 'cancelled')

  const bookedTimes = new Set(
    ((existing ?? []) as Array<{ appointment_time: string }>).map((a) => a.appointment_time)
  )

  const available = allSlots.filter((slot) => !bookedTimes.has(slot))

  return { slots: available, slotDuration }
}

// ── Create appointment ─────────────────────────────────────────────────────

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<{ error?: string; appointmentId?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Double-booking prevention: check if this slot is already taken
  const { data: clash } = await supabase
    .from('appointments')
    .select('id')
    .eq('dietitian_id', user.id)
    .eq('appointment_date', input.appointment_date)
    .eq('appointment_time', input.appointment_time)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (clash) {
    return { error: 'This time slot is already booked. Please choose another.' }
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      dietitian_id: user.id,
      patient_id: input.patient_id,
      purpose: input.purpose,
      custom_purpose: input.purpose === 'custom' ? (input.custom_purpose ?? null) : null,
      mode: input.mode,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      status: 'upcoming',
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const newId = (data as { id: string }).id

  // Update patient last_visit_at
  await supabase
    .from('patients')
    .update({ last_visit_at: new Date().toISOString() })
    .eq('id', input.patient_id)

  // Create timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: user.id,
    patient_id: input.patient_id,
    event_type: 'appointment_created',
    event_data: {
      purpose: input.purpose,
      date: input.appointment_date,
      time: input.appointment_time,
      mode: input.mode,
    } as unknown as Json,
    reference_id: newId,
  })

  revalidatePath('/appointments')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${input.patient_id}`)

  return { appointmentId: newId }
}

// ── Update appointment status ──────────────────────────────────────────────

export async function updateAppointmentStatus(
  id: string,
  status: 'in_progress' | 'completed' | 'cancelled'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the appointment first (for timeline)
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, patient_id, purpose, appointment_date, appointment_time')
    .eq('id', id)
    .eq('dietitian_id', user.id)
    .single()

  if (!appt) return { error: 'Appointment not found' }

  const appointment = appt as Pick<
    Tables<'appointments'>,
    'id' | 'patient_id' | 'purpose' | 'appointment_date' | 'appointment_time'
  >

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('dietitian_id', user.id)

  if (error) return { error: error.message }

  // Timeline event for completion
  if (status === 'completed') {
    await supabase.from('timeline_events').insert({
      dietitian_id: user.id,
      patient_id: appointment.patient_id,
      event_type: 'appointment_completed',
      event_data: {
        purpose: appointment.purpose,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
      } as unknown as Json,
      reference_id: id,
    })

    // Update patient last_visit_at
    await supabase
      .from('patients')
      .update({ last_visit_at: new Date().toISOString() })
      .eq('id', appointment.patient_id)
  }

  revalidatePath('/appointments')
  revalidatePath('/dashboard')
  revalidatePath(`/patients/${appointment.patient_id}`)

  return {}
}
