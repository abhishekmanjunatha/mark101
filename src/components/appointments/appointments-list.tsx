'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  CalendarPlus,
  CalendarDays,
  User,
  ChevronRight,
  Clock,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react'
import type { AppointmentWithPatient } from '@/actions/appointments'
import { updateAppointmentStatus } from '@/actions/appointments'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type FilterKey = 'today' | 'upcoming' | 'completed'

interface AppointmentsListProps {
  appointments: AppointmentWithPatient[]
  activeFilter: FilterKey
}

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
]

const STATUS_CFG: Record<string, { label: string; cn: string }> = {
  upcoming: { label: 'Upcoming', cn: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', cn: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', cn: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', cn: 'bg-red-100 text-red-600 border-red-200' },
}

const PURPOSE_LABELS: Record<string, string> = {
  new_consultation: 'New Consultation',
  follow_up: 'Follow-up',
  review_with_report: 'Review with Report',
  custom: 'Custom',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

export function AppointmentsList({
  appointments,
  activeFilter,
}: AppointmentsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleFilterChange = (key: FilterKey) => {
    const params = new URLSearchParams()
    if (key !== 'today') params.set('filter', key)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleMarkCompleted = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'completed')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Appointment marked as completed')
      }
    })
  }

  const handleMarkInProgress = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'in_progress')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Appointment started')
      }
    })
  }

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'cancelled')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Appointment cancelled')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Top: Filters + Add button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeFilter === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Link
          href="/appointments/new"
          className={cn(
            buttonVariants({ variant: 'default' }),
            'bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0'
          )}
        >
          <CalendarPlus className="h-4 w-4" />
          Add Appointment
        </Link>
      </div>

      {/* Empty State */}
      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-xl bg-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium">No appointments available</p>
          <Link
            href="/appointments/new"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 gap-2')}
          >
            <CalendarPlus className="h-4 w-4" />
            Schedule an appointment
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ───────────────────────────────────── */}
          <div className="hidden md:block rounded-xl border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Patient</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Purpose</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Mode</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Date & Time</th>
                  <th className="text-left font-medium px-4 py-3 text-muted-foreground">Status</th>
                  <th className="text-right font-medium px-4 py-3 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((appt) => {
                  const status = STATUS_CFG[appt.status] ?? STATUS_CFG.upcoming
                  const purposeLabel =
                    appt.purpose === 'custom' && appt.custom_purpose
                      ? appt.custom_purpose
                      : PURPOSE_LABELS[appt.purpose]

                  return (
                    <tr key={appt.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{appt.patient.full_name}</p>
                            <p className="text-xs text-muted-foreground">{appt.patient.patient_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{purposeLabel}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-normal text-xs capitalize">
                          {appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm">{formatDate(appt.appointment_date)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(appt.appointment_time)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            status.cn
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/patients/${appt.patient.id}`}
                            title="Patient Profile"
                            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>

                          {/* Actions dropdown */}
                          {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {appt.status === 'upcoming' && (
                                  <DropdownMenuItem
                                    onClick={() => handleMarkInProgress(appt.id)}
                                    disabled={isPending}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Clock className="h-4 w-4" />
                                    Start Consultation
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleMarkCompleted(appt.id)}
                                  disabled={isPending}
                                  className="gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Mark as Completed
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCancel(appt.id)}
                                  disabled={isPending}
                                  variant="destructive"
                                  className="gap-2 cursor-pointer"
                                >
                                  Cancel Appointment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ────────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {appointments.map((appt) => {
              const status = STATUS_CFG[appt.status] ?? STATUS_CFG.upcoming
              const purposeLabel =
                appt.purpose === 'custom' && appt.custom_purpose
                  ? appt.custom_purpose
                  : PURPOSE_LABELS[appt.purpose]

              return (
                <div
                  key={appt.id}
                  className="p-4 rounded-xl border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{appt.patient.full_name}</p>
                        <p className="text-xs text-muted-foreground">{appt.patient.patient_code}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0',
                        status.cn
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{purposeLabel}</span>
                    <span>{appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'}</span>
                    <span>{formatDate(appt.appointment_date)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(appt.appointment_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/patients/${appt.patient.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 flex-1')}
                    >
                      <User className="h-3.5 w-3.5" />
                      Profile
                    </Link>
                    {appt.status === 'upcoming' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkCompleted(appt.id)}
                        disabled={isPending}
                        className="gap-1.5 flex-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
