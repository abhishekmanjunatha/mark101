import type { Metadata } from 'next'
import { AuthTabs } from './auth-tabs'

export const metadata: Metadata = { title: 'Login — peepal' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  return <AuthTabs initialTab={tab === 'register' ? 'register' : 'login'} />
}
