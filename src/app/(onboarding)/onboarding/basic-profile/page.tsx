import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BasicProfileForm } from './basic-profile-form'
import type { Tables } from '@/types/database'

export default async function BasicProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('dietitians')
    .select('full_name, phone, date_of_birth, gender, primary_practice_location, short_bio, photo_url')
    .eq('id', user.id)
    .single()
  const dietitian = data as Pick<
    Tables<'dietitians'>,
    'full_name' | 'phone' | 'date_of_birth' | 'gender' | 'primary_practice_location' | 'short_bio' | 'photo_url'
  > | null

  return (
    <BasicProfileForm
      userId={user.id}
      defaultValues={{
        email: user.email,
        full_name: dietitian?.full_name ?? '',
        phone: dietitian?.phone ?? '',
        date_of_birth: dietitian?.date_of_birth ?? '',
        gender: (dietitian?.gender as 'male' | 'female' | 'prefer_not_to_say' | 'other') ?? undefined,
        primary_practice_location: dietitian?.primary_practice_location ?? '',
        short_bio: dietitian?.short_bio ?? '',
        photo_url: dietitian?.photo_url ?? '',
      }}
    />
  )
}

