import { z } from 'zod'

export const createAppointmentSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  purpose: z.enum(['new_consultation', 'follow_up', 'review_with_report', 'custom']),
  custom_purpose: z.string().optional(),
  mode: z.enum(['walk_in', 'scheduled']),
  appointment_date: z.string().min(1, 'Appointment date is required'),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/, 'Select a time slot'),
  notes: z.string().optional(),
}).refine(
  (data) => data.purpose !== 'custom' || (data.custom_purpose && data.custom_purpose.trim().length > 0),
  { message: 'Enter a custom purpose', path: ['custom_purpose'] }
)

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
