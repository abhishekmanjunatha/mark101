import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/patients', '/appointments', '/profile', '/onboarding']
// Routes that are only for unauthenticated users
const AUTH_ROUTES = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  // Unauthenticated user trying to access protected route → redirect to login
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user trying to visit auth pages → redirect to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|lab-upload).*)',
  ],
}
