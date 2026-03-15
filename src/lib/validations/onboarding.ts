import { z } from 'zod'

// ─── Step 1: Basic Profile ───────────────────────────────────────────────────

export const basicProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(7, 'Enter a valid phone number').max(20),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'prefer_not_to_say', 'other'], {
    message: 'Select a gender',
  }),
  primary_practice_location: z.string().min(1, 'Practice location is required').max(100),
  short_bio: z.string().max(300, 'Bio cannot exceed 300 characters').optional(),
  photo_url: z.string().optional(),
})

export type BasicProfileInput = z.infer<typeof basicProfileSchema>

// ─── Step 2: Professional Details ───────────────────────────────────────────

export const educationEntrySchema = z.object({
  degree: z.string().min(1, 'Degree is required'),
  institution: z.string().min(1, 'Institution is required'),
  graduation_year: z.string().length(4, 'Enter a 4-digit year').regex(/^\d+$/, 'Must be numeric'),
})

export const professionalSchema = z.object({
  primary_qualification: z.string().min(1, 'Primary qualification is required'),
  additional_certifications: z.array(z.string()).optional(),
  years_of_experience: z.enum(['0-1', '1-3', '3-5', '5-10', '10+'], {
    message: 'Select years of experience',
  }),
  specializations: z.array(z.string()).min(1, 'Select at least one specialization'),
  registration_number: z.string().optional(),
  education: z.array(educationEntrySchema).optional(),
})

export type ProfessionalInput = z.infer<typeof professionalSchema>

// ─── Step 3: Practice Details ────────────────────────────────────────────────

export const practiceSchema = z.object({
  practice_type: z.enum(['online_only', 'clinic_only', 'both'], {
    message: 'Select a practice type',
  }),
  clinic_name: z.string().optional(),
  practice_address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  online_consultation_fee: z.number().min(0).optional(),
  clinic_consultation_fee: z.number().min(0).optional(),
  consultation_duration: z.number().refine((v) => [15, 20, 30, 45, 60].includes(v), 'Select a valid duration'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
}).superRefine((data, ctx) => {
  if (data.practice_type !== 'online_only') {
    if (!data.clinic_name?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['clinic_name'], message: 'Clinic name is required' })
    }
    if (!data.practice_address?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['practice_address'], message: 'Address is required' })
    }
  }
})

export type PracticeInput = z.infer<typeof practiceSchema>

// ─── Step 4: Availability ────────────────────────────────────────────────────

export const timeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
}).refine((s) => s.start < s.end, { message: 'End time must be after start time' })

export const dayScheduleSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  is_available: z.boolean(),
  time_slots: z.array(timeSlotSchema).default([]),
})

export const availabilitySchema = z.object({
  days: z.array(dayScheduleSchema).length(7),
  slot_duration: z.number().refine((v) => [15, 20, 30, 45, 60].includes(v)),
  buffer_time: z.number().refine((v) => [0, 5, 10, 15].includes(v)),
}).superRefine((data, ctx) => {
  for (const day of data.days) {
    if (day.is_available && day.time_slots.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['days'],
        message: `Add at least one time slot for ${day.day}`,
      })
    }
  }
})

export type AvailabilityInput = z.infer<typeof availabilitySchema>
export type DayScheduleInput = z.infer<typeof dayScheduleSchema>
