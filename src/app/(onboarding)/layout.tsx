import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Setup' }

// Onboarding route group layout — centered single-column with progress bar space
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">{children}</div>
    </main>
  )
}
