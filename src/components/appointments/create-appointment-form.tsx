'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  User,
  UserPlus,
  X,
  CalendarDays,
  Clock,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { createClient } from '@/lib/supabase/client'
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from '@/lib/validations/appointment'
import { createAppointment, getAvailableSlots } from '@/actions/appointments'
import { createPatient } from '@/actions/patients'
import { PatientForm } from '@/components/patients/patient-form'

// ── Types ──────────────────────────────────────────────────────────────────

interface PatientResult {
  id: string
  full_name: string
  patient_code: string
  phone: string
}

// ── Component ──────────────────────────────────────────────────────────────

export function CreateAppointmentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')

  const [isPending, startTransition] = useTransition()

  // Patient search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PatientResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Selected patient
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)

  // Inline patient creation
  const [showInlineCreate, setShowInlineCreate] = useState(false)

  // Slot state
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotDuration, setSlotDuration] = useState(30)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      patient_id: preselectedPatientId ?? '',
      purpose: undefined,
      mode: undefined,
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '',
      notes: '',
    },
  })

  const watchMode = watch('mode')
  const watchPurpose = watch('purpose')
  const watchDate = watch('appointment_date')
  const watchTime = watch('appointment_time')

  // ── Pre-select patient from URL ──────────────────────────────────────
  useEffect(() => {
    if (!preselectedPatientId) return
    const fetchPatient = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, patient_code, phone')
        .eq('id', preselectedPatientId)
        .single()
      if (data) {
        setSelectedPatient(data as PatientResult)
        setValue('patient_id', (data as PatientResult).id)
      }
    }
    fetchPatient()
  }, [preselectedPatientId, setValue])

  // ── Patient search ───────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const search = async () => {
      setSearchLoading(true)
      try {
        const supabase = createClient()
        const term = debouncedSearch.trim()
        const { data } = await supabase
          .from('patients')
          .select('id, full_name, patient_code, phone')
          .or(`full_name.ilike.%${term}%,patient_code.ilike.%${term}%,phone.ilike.%${term}%`)
          .limit(8)
        setSearchResults((data as PatientResult[]) ?? [])
        setSearchOpen(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }
    search()
  }, [debouncedSearch])

  // ── Fetch available slots when date changes ──────────────────────────
  useEffect(() => {
    if (!watchDate || watchMode !== 'scheduled') {
      setAvailableSlots([])
      return
    }
    const fetchSlots = async () => {
      setSlotsLoading(true)
      const result = await getAvailableSlots(watchDate)
      setAvailableSlots(result.slots)
      setSlotDuration(result.slotDuration)
      setSlotsLoading(false)
      // Clear selected time if it's no longer available
      if (watchTime && !result.slots.includes(watchTime)) {
        setValue('appointment_time', '')
      }
    }
    fetchSlots()
  }, [watchDate, watchMode, setValue, watchTime])

  // ── Select patient handler ───────────────────────────────────────────
  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient)
    setValue('patient_id', patient.id)
    setSearchQuery('')
    setSearchOpen(false)
    setShowInlineCreate(false)
  }

  // ── Inline patient created ───────────────────────────────────────────
  const handleInlinePatientCreated = async (patientId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('patients')
      .select('id, full_name, patient_code, phone')
      .eq('id', patientId)
      .single()
    if (data) {
      handleSelectPatient(data as PatientResult)
    }
    setShowInlineCreate(false)
  }

  // ── Change patient ───────────────────────────────────────────────────
  const handleChangePatient = () => {
    setSelectedPatient(null)
    setValue('patient_id', '')
    setSearchQuery('')
  }

  // ── Format helpers ───────────────────────────────────────────────────
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
  }

  // ── Walk-in: auto-fill date/time ─────────────────────────────────────
  useEffect(() => {
    if (watchMode === 'walk_in') {
      const now = new Date()
      setValue('appointment_date', now.toISOString().split('T')[0])
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setValue('appointment_time', `${hh}:${mm}`)
    }
  }, [watchMode, setValue])

  // ── Submit ───────────────────────────────────────────────────────────
  const onSubmit = (data: CreateAppointmentInput) => {
    startTransition(async () => {
      const result = await createAppointment(data)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Appointment created!')
      router.push('/appointments')
    })
  }

  // ── Summary data ─────────────────────────────────────────────────────
  const PURPOSE_LABELS: Record<string, string> = {
    new_consultation: 'New Consultation',
    follow_up: 'Follow-up',
    review_with_report: 'Review with Report',
    custom: 'Custom',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 1: Patient Search                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or patient ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setSearchOpen(true)
                  }}
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchOpen(false)
                    }}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {searchOpen && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
                  {searchLoading && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
                  )}
                  {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No patients found for &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                  {!searchLoading &&
                    searchResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{patient.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {patient.patient_code} · {patient.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Add New Patient button */}
            {!showInlineCreate && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setShowInlineCreate(true)
                  setSearchOpen(false)
                }}
              >
                <UserPlus className="h-4 w-4" />
                + Add New Patient
              </Button>
            )}

            {/* Section 2: Inline Patient Creation */}
            {showInlineCreate && (
              <div className="border rounded-xl p-5 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Create New Patient</h3>
                  <button
                    type="button"
                    onClick={() => setShowInlineCreate(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <PatientForm mode="create" onSuccess={handleInlinePatientCreated} />
              </div>
            )}

            {errors.patient_id && (
              <p className="text-xs text-destructive">{errors.patient_id.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 3: Selected Patient Summary                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{selectedPatient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {selectedPatient.patient_code}
                </code>
                <span className="mx-1.5">·</span>
                {selectedPatient.phone}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleChangePatient}
              className="shrink-0"
            >
              Change Patient
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 4: Appointment Details                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Purpose */}
              <div className="space-y-1.5">
                <Label>
                  Purpose <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="purpose"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_consultation">New Consultation</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="review_with_report">Review with Report</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.purpose && (
                  <p className="text-xs text-destructive">{errors.purpose.message}</p>
                )}
              </div>

              {/* Custom purpose (conditional) */}
              {watchPurpose === 'custom' && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom_purpose">
                    Custom Purpose <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="custom_purpose"
                    placeholder="Enter custom purpose"
                    {...register('custom_purpose')}
                  />
                  {errors.custom_purpose && (
                    <p className="text-xs text-destructive">{errors.custom_purpose.message}</p>
                  )}
                </div>
              )}

              {/* Mode */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Appointment Mode <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="mode"
                  render={({ field }) => (
                    <div className="flex gap-3">
                      {([
                        { value: 'walk_in', label: 'Walk-in', desc: 'Patient is here now' },
                        { value: 'scheduled', label: 'Scheduled', desc: 'Book a future slot' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            'flex-1 rounded-xl border p-4 text-left transition-all hover:border-emerald-400',
                            field.value === opt.value
                              ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                              : 'border-border'
                          )}
                        >
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                />
                {errors.mode && (
                  <p className="text-xs text-destructive">{errors.mode.message}</p>
                )}
              </div>

              {/* Date (for scheduled mode) */}
              {watchMode === 'scheduled' && (
                <div className="space-y-1.5">
                  <Label htmlFor="appointment_date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    {...register('appointment_date')}
                  />
                  {errors.appointment_date && (
                    <p className="text-xs text-destructive">{errors.appointment_date.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Time Slot Selection ──────────────────────────────── */}
            {watchMode === 'scheduled' && watchDate && (
              <div className="space-y-2">
                <Label>
                  Time Slot <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({slotDuration} min per slot)
                  </span>
                </Label>

                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading available slots…
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <CalendarDays className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    <p>No available slots for this date.</p>
                    <p className="text-xs mt-1">
                      The dietitian may not have set availability for this day, or all slots are booked.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setValue('appointment_time', slot)}
                        className={cn(
                          'rounded-lg border px-3.5 py-2 text-sm font-medium transition-all',
                          watchTime === slot
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                            : 'border-border bg-background text-foreground hover:border-emerald-400 hover:bg-emerald-50'
                        )}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
                {errors.appointment_time && (
                  <p className="text-xs text-destructive">{errors.appointment_time.message}</p>
                )}
              </div>
            )}

            {/* Walk-in confirmation */}
            {watchMode === 'walk_in' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                Walk-in appointment will be created for now ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}).
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes for this appointment..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 5: Appointment Summary                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && watchMode && watchPurpose && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Appointment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Patient</dt>
                <dd className="font-medium">{selectedPatient.full_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Purpose</dt>
                <dd className="font-medium">
                  {watchPurpose === 'custom'
                    ? watch('custom_purpose') || 'Custom'
                    : PURPOSE_LABELS[watchPurpose]}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Mode</dt>
                <dd className="font-medium capitalize">
                  {watchMode === 'walk_in' ? 'Walk-in' : 'Scheduled'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Date</dt>
                <dd className="font-medium">
                  {watchDate
                    ? new Date(watchDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </dd>
              </div>
              {watchTime && (
                <div>
                  <dt className="text-muted-foreground text-xs">Time</dt>
                  <dd className="font-medium">{formatTime(watchTime)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Actions                                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && (
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Appointment
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      )}
    </form>
  )
}
