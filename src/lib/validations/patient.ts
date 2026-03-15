import { z } from 'zod'

export const createPatientSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  date_of_birth: z.string().optional(),
  height_cm: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  activity_level: z.enum(['sedentary', 'lightly_active', 'highly_active']).optional(),
  sleep_hours: z.number().min(0).max(24).optional(),
  work_type: z.enum(['desk_job', 'field_work', 'other']).optional(),
  dietary_type: z.enum(['vegetarian', 'non_vegetarian', 'vegan', 'eggitarian']).optional(),
  medical_conditions: z.array(z.string()).optional(),
  food_allergies: z.array(z.string()).optional(),
  primary_goal: z
    .enum(['weight_loss', 'muscle_gain', 'maintenance', 'condition_management'])
    .optional(),
})

export const updatePatientSchema = createPatientSchema.partial()

export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
