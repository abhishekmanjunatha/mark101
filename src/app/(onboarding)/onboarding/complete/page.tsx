import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompleteContent } from './complete-content'
import type { Tables } from '@/types/database'

export default async function OnboardingCompletePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [d1, d2, d3] = await Promise.all([
    supabase.from('dietitians').select('full_name, photo_url, primary_practice_location').eq('id', user.id).single(),
    supabase.from('dietitian_professional').select('primary_qualification, specializations').eq('dietitian_id', user.id).single(),
    supabase.from('dietitian_practice').select('practice_type, online_consultation_fee, clinic_consultation_fee').eq('dietitian_id', user.id).single(),
  ])

  const dietitian = d1.data as Pick<Tables<'dietitians'>, 'full_name' | 'photo_url' | 'primary_practice_location'> | null
  const professional = d2.data as Pick<Tables<'dietitian_professional'>, 'primary_qualification' | 'specializations'> | null
  const practice = d3.data as Pick<Tables<'dietitian_practice'>, 'practice_type' | 'online_consultation_fee' | 'clinic_consultation_fee'> | null

  if (!dietitian) redirect('/onboarding/basic-profile')

  return (
    <CompleteContent
      dietitian={dietitian}
      professional={professional}
      practice={
        practice
          ? {
              ...practice,
              online_consultation_fee: Number(practice.online_consultation_fee ?? 0),
              clinic_consultation_fee: Number(practice.clinic_consultation_fee ?? 0),
            }
          : null
      }
    />
  )
}

