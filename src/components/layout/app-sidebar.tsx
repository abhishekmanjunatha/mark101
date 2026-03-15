'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  FlaskConical,
  FolderOpen,
  Settings,
  Leaf,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/clinical-notes', label: 'Clinical Notes', icon: FileText },
  { href: '/lab-reports', label: 'Lab Reports', icon: FlaskConical },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r bg-card shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight">peepal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
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
      </nav>

      {/* Bottom: Settings */}
      <div className="px-3 pb-4 border-t pt-3">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/profile'
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Profile & Settings
        </Link>
      </div>
    </aside>
  )
}
