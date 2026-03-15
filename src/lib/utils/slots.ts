import type { DayAvailability, TimeSlot, SlotDuration, BufferTime } from '@/types/app'

/**
 * Generate bookable time slots from a day's availability configuration.
 * Slot start times are spaced by (slotDuration + bufferTime) minutes.
 */
export function generateSlots(
  availability: DayAvailability,
  slotDuration: SlotDuration,
  bufferTime: BufferTime
): string[] {
  if (!availability.available) return []

  const slots: string[] = []
  const interval = slotDuration + bufferTime

  for (const { start, end } of availability.slots) {
    let current = timeToMinutes(start)
    const endMinutes = timeToMinutes(end)

    while (current + slotDuration <= endMinutes) {
      slots.push(minutesToTime(current))
      current += interval
    }
  }

  return slots
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Check if two time slots overlap (used to prevent double-booking).
 */
export function slotsOverlap(
  a: TimeSlot,
  b: TimeSlot,
  durationMinutes: number
): boolean {
  const aStart = timeToMinutes(a.start)
  const aEnd = aStart + durationMinutes
  const bStart = timeToMinutes(b.start)
  const bEnd = bStart + durationMinutes
  return aStart < bEnd && bStart < aEnd
}
