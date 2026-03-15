import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AvailabilityForm } from './availability-form'
import type { DayScheduleInput } from '@/lib/validations/onboarding'
import type { Tables } from '@/types/database'

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('dietitian_availability')
    .select('*')
    .eq('dietitian_id', user.id)

  const rows = data as Tables<'dietitian_availability'>[] | null

  const existingByDay: Record<string, DayScheduleInput> = {}
  let defaultSlotDuration = 30
  let defaultBufferTime = 0

  if (rows && rows.length > 0) {
    defaultSlotDuration = rows[0].slot_duration
    defaultBufferTime = rows[0].buffer_time
    for (const row of rows) {
      existingByDay[row.day_of_week] = {
        day: row.day_of_week as DayScheduleInput['day'],
        is_available: row.is_available,
        time_slots: (row.time_slots as { start: string; end: string }[]) ?? [],
      }
    }
  }

  return (
    <AvailabilityForm
      existingByDay={existingByDay}
      defaultSlotDuration={defaultSlotDuration}
      defaultBufferTime={defaultBufferTime}
    />
  )
}


