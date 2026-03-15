import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopBar } from '@/components/layout/app-top-bar'

const ONBOARDING_STEPS = [
  '/onboarding/basic-profile',
  '/onboarding/professional',
  '/onboarding/practice',
  '/onboarding/availability',
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('dietitians')
    .select('onboarding_complete, onboarding_step, full_name, photo_url')
    .eq('id', user.id)
    .single()
  const dietitian = data as Pick<
    Tables<'dietitians'>,
    'onboarding_complete' | 'onboarding_step' | 'full_name' | 'photo_url'
  > | null

  if (!dietitian?.onboarding_complete) {
    const step = dietitian?.onboarding_step ?? 0
    redirect(ONBOARDING_STEPS[Math.min(step, 3)])
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopBar
          dietitianName={dietitian?.full_name ?? 'Dietitian'}
          dietitianPhoto={dietitian?.photo_url}
        />
        <main className="flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

