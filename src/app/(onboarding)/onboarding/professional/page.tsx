import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalForm } from './professional-form'
import type { Tables } from '@/types/database'

export default async function ProfessionalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('dietitian_professional')
    .select('*')
    .eq('dietitian_id', user.id)
    .single()
  const prof = data as Tables<'dietitian_professional'> | null

  return (
    <ProfessionalForm
      defaultValues={
        prof
          ? {
              primary_qualification: prof.primary_qualification ?? '',
              additional_certifications: (prof.additional_certifications as string[]) ?? [],
              years_of_experience: prof.years_of_experience as '0-1' | '1-3' | '3-5' | '5-10' | '10+' | undefined,
              specializations: (prof.specializations as string[]) ?? [],
              registration_number: prof.registration_number ?? '',
              education: (prof.education as { degree: string; institution: string; graduation_year: string }[]) ?? [],
            }
          : undefined
      }
    />
  )
}

