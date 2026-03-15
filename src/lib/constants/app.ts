export const APP_NAME = 'peepal'
export const APP_TAGLINE = 'Your complete dietitian practice, simplified.'

// Onboarding steps
export const ONBOARDING_STEPS = [
  { step: 1, title: 'Basic Profile', path: '/onboarding/basic-profile' },
  { step: 2, title: 'Professional Details', path: '/onboarding/professional' },
  { step: 3, title: 'Clinic / Practice', path: '/onboarding/practice' },
  { step: 4, title: 'Availability', path: '/onboarding/availability' },
]

// Consultation durations (minutes)
export const CONSULTATION_DURATIONS = [15, 20, 30, 45, 60] as const

// Buffer times (minutes)
export const BUFFER_TIMES = [0, 5, 10, 15] as const

// Resend email cooldown (seconds)
export const RESEND_EMAIL_COOLDOWN = 30

// Patient code prefix
export const PATIENT_CODE_PREFIX = 'PAT'

// Upload limits
export const MAX_PROFILE_PHOTO_SIZE_MB = 5
export const MAX_CERTIFICATE_SIZE_MB = 10
export const MAX_LAB_REPORT_SIZE_MB = 20

// Upload link expiry
export const UPLOAD_TOKEN_EXPIRY_HOURS = 48

// Pagination
export const PATIENTS_PER_PAGE = 20
export const APPOINTMENTS_PER_PAGE = 20
export const RECENT_PATIENTS_COUNT = 5

// Days of week
export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const
