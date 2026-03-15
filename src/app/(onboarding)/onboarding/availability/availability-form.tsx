'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { OnboardingHeader } from '@/components/onboarding/onboarding-header'
import { availabilitySchema } from '@/lib/validations/onboarding'
import type { DayScheduleInput } from '@/lib/validations/onboarding'
import { CONSULTATION_DURATIONS, BUFFER_TIMES, DAYS_OF_WEEK } from '@/lib/constants/app'
import { saveAvailability } from '@/actions/onboarding'
import { generateSlots } from '@/lib/utils/slots'
import type { SlotDuration, BufferTime, DayAvailability } from '@/types/app'

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const DEFAULT_SLOT = { start: '09:00', end: '17:00' }

function buildDefaultDays(existing?: Record<string, DayScheduleInput>): DayScheduleInput[] {
  return DAYS_OF_WEEK.map((day) => {
    const ex = existing?.[day]
    if (ex) return ex
    // Mon–Fri available by default
    const isWeekday = !['saturday', 'sunday'].includes(day)
    return {
      day: day as DayScheduleInput['day'],
      is_available: isWeekday,
      time_slots: isWeekday ? [{ ...DEFAULT_SLOT }] : [],
    }
  })
}

interface AvailabilityFormProps {
  existingByDay?: Record<string, DayScheduleInput>
  defaultSlotDuration?: number
  defaultBufferTime?: number
}

export function AvailabilityForm({
  existingByDay,
  defaultSlotDuration = 30,
  defaultBufferTime = 0,
}: AvailabilityFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [days, setDays] = useState<DayScheduleInput[]>(() => buildDefaultDays(existingByDay))
  const [slotDuration, setSlotDuration] = useState(defaultSlotDuration)
  const [bufferTime, setBufferTime] = useState(defaultBufferTime)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  // Slot preview (first available day)
  const previewSlots = useMemo(() => {
    const firstAvailable = days.find((d) => d.is_available && d.time_slots.length > 0)
    if (!firstAvailable) return []
    const avail: DayAvailability = {
      day: firstAvailable.day,
      available: true,
      slots: firstAvailable.time_slots,
    }
    return generateSlots(avail, slotDuration as SlotDuration, bufferTime as BufferTime)
  }, [days, slotDuration, bufferTime])

  const updateDay = (
    dayIdx: number,
    field: 'is_available' | 'time_slots',
    value: boolean | { start: string; end: string }[]
  ) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d
        if (field === 'is_available') {
          const isAvail = value as boolean
          return {
            ...d,
            is_available: isAvail,
            time_slots: isAvail && d.time_slots.length === 0 ? [{ ...DEFAULT_SLOT }] : d.time_slots,
          }
        }
        return { ...d, time_slots: value as { start: string; end: string }[] }
      })
    )
  }

  const addSlot = (dayIdx: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, time_slots: [...d.time_slots, { start: '09:00', end: '17:00' }] }
          : d
      )
    )
  }

  const removeSlot = (dayIdx: number, slotIdx: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, time_slots: d.time_slots.filter((_, si) => si !== slotIdx) }
          : d
      )
    )
  }

  const updateSlot = (
    dayIdx: number,
    slotIdx: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              time_slots: d.time_slots.map((s, si) =>
                si === slotIdx ? { ...s, [field]: value } : s
              ),
            }
          : d
      )
    )
  }

  const handleSubmit = (action: 'continue' | 'draft') => {
    const result = availabilitySchema.safeParse({
      days,
      slot_duration: slotDuration,
      buffer_time: bufferTime,
    })
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Please fix the errors above'
      setFormError(msg)
      return
    }
    setFormError(null)

    startTransition(async () => {
      const res = await saveAvailability(result.data)
      if (res?.error) {
        setFormError(res.error)
        return
      }
      if (action === 'draft') {
        toast.success('Progress saved!')
        router.push('/dashboard')
      } else {
        router.push('/onboarding/complete')
      }
    })
  }

  return (
    <div>
      <OnboardingHeader
        currentStep={4}
        title="Set Your Availability"
        description="Define when patients can book online consultations with you."
      />

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Slot settings */}
        <div className="px-6 py-5 border-b bg-muted/30">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Slot Duration</Label>
              <Select
                value={String(slotDuration)}
                onValueChange={(v) => setSlotDuration(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTATION_DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Buffer Between Appointments</Label>
              <Select
                value={String(bufferTime)}
                onValueChange={(v) => setBufferTime(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUFFER_TIMES.map((b) => (
                    <SelectItem key={b} value={String(b)}>
                      {b === 0 ? 'No buffer' : `${b} minutes`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Weekly schedule */}
        <div className="divide-y">
          {days.map((day, dayIdx) => (
            <div key={day.day} className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.is_available}
                    onCheckedChange={(v) => updateDay(dayIdx, 'is_available', v)}
                    id={`toggle-${day.day}`}
                  />
                  <label
                    htmlFor={`toggle-${day.day}`}
                    className={cn(
                      'text-sm font-medium cursor-pointer',
                      !day.is_available && 'text-muted-foreground'
                    )}
                  >
                    {DAY_LABELS[day.day]}
                  </label>
                </div>
                {!day.is_available && (
                  <Badge variant="secondary" className="text-xs">Unavailable</Badge>
                )}
              </div>

              {day.is_available && (
                <div className="ml-8 space-y-2">
                  {day.time_slots.map((slot, si) => (
                    <div key={si} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(dayIdx, si, 'start', e.target.value)}
                          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(dayIdx, si, 'end', e.target.value)}
                          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      {day.time_slots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlot(dayIdx, si)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addSlot(dayIdx)}
                    className="text-muted-foreground h-7 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add time slot
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Preview */}
        {previewSlots.length > 0 && (
          <div className="px-6 py-5 border-t bg-muted/30">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setShowPreview((v) => !v)}
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Slot Preview</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {previewSlots.length} slots generated for first available day
              </span>
            </div>
            {showPreview && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previewSlots.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs font-mono">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {formError && (
          <div className="mx-6 mb-0 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-5 border-t flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/onboarding/practice')}
            disabled={isPending}
          >
            ← Back
          </Button>
          <Button className="flex-1" onClick={() => handleSubmit('continue')} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            ) : (
              'Save Availability & Complete Setup →'
            )}
          </Button>
          <Button variant="ghost" onClick={() => handleSubmit('draft')} disabled={isPending}>
            Save Draft
          </Button>
        </div>
      </div>
    </div>
  )
}
