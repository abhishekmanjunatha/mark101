import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PracticeForm } from './practice-form'
import type { Tables } from '@/types/database'

export default async function PracticePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('dietitian_practice')
    .select('*')
    .eq('dietitian_id', user.id)
    .single()
  const practice = data as Tables<'dietitian_practice'> | null

  return (
    <PracticeForm
      defaultValues={
        practice
          ? {
              practice_type: practice.practice_type as 'online_only' | 'clinic_only' | 'both' | undefined,
              clinic_name: practice.clinic_name ?? '',
              practice_address: practice.practice_address ?? '',
              city: practice.city ?? '',
              state: practice.state ?? '',
              pincode: practice.pincode ?? '',
              online_consultation_fee: Number(practice.online_consultation_fee ?? 0),
              clinic_consultation_fee: Number(practice.clinic_consultation_fee ?? 0),
              consultation_duration: practice.consultation_duration ?? 30,
              languages: (practice.languages as string[]) ?? [],
            }
          : undefined
      }
    />
  )
}

