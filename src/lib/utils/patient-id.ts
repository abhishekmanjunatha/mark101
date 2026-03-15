import { PATIENT_CODE_PREFIX } from '@/lib/constants/app'

/**
 * Generates a unique patient code: PAT-YYYYMMDD-XXXX
 * e.g. PAT-20260315-A3F2
 */
export function generatePatientCode(): string {
  const date = new Date()
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  const randomPart = Math.random().toString(36).toUpperCase().slice(2, 6)
  return `${PATIENT_CODE_PREFIX}-${datePart}-${randomPart}`
}
