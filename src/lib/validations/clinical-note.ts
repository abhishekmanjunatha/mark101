import { z } from 'zod'

export const documentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['title', 'meal_section', 'instructions', 'custom']),
  label: z.string().min(1, 'Label is required'),
  content: z.string(),
  order: z.number(),
})

export const createClinicalNoteSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  document_type: z.enum(['quick_note', 'meal_plan', 'follow_up_recommendation', 'custom']),
  title: z.string().min(1, 'Title is required').max(200),
  blocks: z.array(documentBlockSchema).min(1, 'At least one content block is required'),
})

export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>
export type DocumentBlockInput = z.infer<typeof documentBlockSchema>
