import type { Metadata } from 'next'
import { getDietitianProfile } from '@/actions/dietitian'
import { ProfileSettings } from '@/components/profile/profile-settings'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Profile Settings' }

export default async function ProfilePage() {
  const data = await getDietitianProfile()

  if (!data.dietitian) redirect('/onboarding/basic-profile')

  return (
    <ProfileSettings
      dietitian={data.dietitian}
      professional={data.professional}
      practice={data.practice}
      availability={data.availability}
      email={data.email}
    />
  )
}
