'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Leaf,
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  FlaskConical,
  FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { signOut } from '@/actions/auth'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/appointments/new': 'Create Appointment',
  '/clinical-notes': 'Clinical Notes',
  '/lab-reports': 'Lab Reports',
  '/documents': 'Documents',
  '/profile': 'Profile & Settings',
}

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/clinical-notes', label: 'Clinical Notes', icon: FileText },
  { href: '/lab-reports', label: 'Lab Reports', icon: FlaskConical },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
]

interface AppTopBarProps {
  dietitianName: string
  dietitianPhoto?: string | null
}

export function AppTopBar({ dietitianName, dietitianPhoto }: AppTopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const title =
    Object.entries(PAGE_TITLES).find(([path]) => pathname === path)?.[1] ??
    (pathname.startsWith('/patients/') ? 'Patient Profile' : 'peepal')

  const initials = dietitianName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Page title */}
        <h1 className="text-base font-semibold lg:text-lg hidden sm:block">{title}</h1>
        <div className="lg:hidden flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 lg:hidden">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">peepal</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={dietitianPhoto ?? undefined} />
                  <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium max-w-32 truncate">
                  {dietitianName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium truncate">{dietitianName}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer gap-2">
                <Settings className="h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isPending}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isPending ? 'Signing out…' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col lg:hidden">
            <div className="flex items-center gap-2.5 px-5 py-5 border-b">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight">peepal</span>
            </div>
            <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-emerald-600')} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </>
      )}
    </>
  )
}
