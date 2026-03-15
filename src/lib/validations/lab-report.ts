import { z } from 'zod'

export const uploadLabReportSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  title: z.string().min(1, 'Report title is required').max(200),
  report_type: z.enum(['blood_test', 'thyroid_panel', 'vitamin_panel', 'lipid_profile', 'other']).optional(),
})

export type UploadLabReportInput = z.infer<typeof uploadLabReportSchema>
