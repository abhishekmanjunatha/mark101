// ─────────────────────────────────────────────
// Dietitian
// ─────────────────────────────────────────────
export type PracticeType = 'online_only' | 'clinic_only' | 'both'
export type Gender = 'male' | 'female' | 'prefer_not_to_say' | 'other'
export type YearsOfExperience = '0-1' | '1-3' | '3-5' | '5-10' | '10+'

// ─────────────────────────────────────────────
// Patient
// ─────────────────────────────────────────────
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'highly_active'
export type WorkType = 'desk_job' | 'field_work' | 'other'
export type DietaryType = 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggitarian'
export type PrimaryGoal = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'condition_management'

// ─────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────
export type AppointmentPurpose = 'new_consultation' | 'follow_up' | 'review_with_report' | 'custom'
export type AppointmentMode = 'walk_in' | 'scheduled'
export type AppointmentStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled'

// ─────────────────────────────────────────────
// Clinical Notes
// ─────────────────────────────────────────────
export type DocumentType = 'quick_note' | 'meal_plan' | 'follow_up_recommendation' | 'custom'

export type DocumentBlock = {
  id: string
  type: 'title' | 'meal_section' | 'instructions' | 'custom'
  label: string
  content: string
  order: number
}

// ─────────────────────────────────────────────
// Lab Reports
// ─────────────────────────────────────────────
export type ReportType = 'blood_test' | 'thyroid_panel' | 'vitamin_panel' | 'lipid_profile' | 'other'
export type ReportSource = 'patient' | 'dietitian'

// ─────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────
export type TimelineEventType =
  | 'appointment_created'
  | 'appointment_completed'
  | 'clinical_document_created'
  | 'lab_report_uploaded'
  | 'weight_updated'
  | 'note_added'

// ─────────────────────────────────────────────
// Availability
// ─────────────────────────────────────────────
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type SlotDuration = 15 | 20 | 30 | 45 | 60
export type BufferTime = 0 | 5 | 10 | 15

export type TimeSlot = {
  start: string  // HH:mm
  end: string    // HH:mm
}

export type DayAvailability = {
  day: DayOfWeek
  available: boolean
  slots: TimeSlot[]
}
