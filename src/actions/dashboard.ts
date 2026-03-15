'use server'

import { createClient } from '@/lib/supabase/server'

export interface TodayAppointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  mode: 'walk_in' | 'scheduled'
  purpose: 'new_consultation' | 'follow_up' | 'review_with_report' | 'custom'
  custom_purpose: string | null
  patient: {
    id: string
    full_name: string
    patient_code: string
    phone: string | null
  }
}

export interface RecentPatient {
  id: string
  full_name: string
  patient_code: string
  phone: string
  last_visit_at: string | null
}

export async function getTodayAppointments(): Promise<TodayAppointment[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time, status, mode, purpose, custom_purpose, patients(id, full_name, patient_code, phone)')
    .eq('dietitian_id', user.id)
    .eq('appointment_date', today)
    .neq('status', 'cancelled')
    .order('appointment_time', { ascending: true })

  if (error || !data) return []

  return (data as unknown as Array<{
    id: string
    appointment_date: string
    appointment_time: string
    status: TodayAppointment['status']
    mode: TodayAppointment['mode']
    purpose: TodayAppointment['purpose']
    custom_purpose: string | null
    patients: {
      id: string
      full_name: string
      patient_code: string
      phone: string | null
    }
  }>).map((row) => ({
    id: row.id,
    appointment_date: row.appointment_date,
    appointment_time: row.appointment_time,
    status: row.status,
    mode: row.mode,
    purpose: row.purpose,
    custom_purpose: row.custom_purpose,
    patient: row.patients,
  }))
}

export async function getRecentPatients(): Promise<RecentPatient[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, patient_code, phone, last_visit_at')
    .eq('dietitian_id', user.id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })
    .limit(5)

  if (error || !data) return []

  return data as RecentPatient[]
}
