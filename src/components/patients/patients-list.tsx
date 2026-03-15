'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  UserPlus,
  ChevronRight,
  User,
  Pencil,
  X,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PatientsListProps {
  patients: Tables<'patients'>[]
  searchQuery: string
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  condition_management: 'Condition Management',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PatientsList({ patients, searchQuery }: PatientsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(searchQuery)
  const [, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value)
    startTransition(() => {
      const params = new URLSearchParams()
      if (value.trim()) params.set('q', value.trim())
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setQuery('')
    startTransition(() => {
      router.replace(pathname)
    })
  }

  return (
    <div className="space-y-4">
      {/* Top bar: search + add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone, or patient ID..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-muted-foreground"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Link
          href="/patients/new"
          className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0')}
        >
          <UserPlus className="h-4 w-4" />
          Add Patient
        </Link>
      </div>

      {/* Table */}
      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-xl bg-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <User className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium">
            {query ? `No patients matching "${query}"` : 'No patients yet'}
          </p>
          {!query && (
            <Link
              href="/patients/new"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 gap-2')}
            >
              <UserPlus className="h-4 w-4" />
              Add your first patient
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Patient</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Phone</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Primary Goal</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Last Visit</th>
                  <th className="text-right font-medium px-4 py-3 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/patients/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">{p.patient_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                    <td className="px-4 py-3">
                      {p.primary_goal ? (
                        <Badge variant="secondary" className="font-normal">
                          {GOAL_LABELS[p.primary_goal] ?? p.primary_goal}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(p.last_visit_at)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/patients/${p.id}`}
                          title="Open Profile"
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/patients/${p.id}/edit`}
                          title="Edit Patient"
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.patient_code} · {p.phone}
                  </p>
                  {p.last_visit_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last visit: {formatDate(p.last_visit_at)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
