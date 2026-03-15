export const SPECIALIZATIONS = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'weight_gain', label: 'Weight Gain' },
  { value: 'diabetes_management', label: 'Diabetes Management' },
  { value: 'pcos_hormonal_health', label: 'PCOS / Hormonal Health' },
  { value: 'sports_nutrition', label: 'Sports Nutrition' },
  { value: 'pediatric_nutrition', label: 'Pediatric Nutrition' },
  { value: 'gut_health', label: 'Gut Health' },
  { value: 'clinical_nutrition', label: 'Clinical Nutrition' },
] as const

export type SpecializationValue = typeof SPECIALIZATIONS[number]['value']
