'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createPatientSchema, type CreatePatientInput } from '@/lib/validations/patient'
import { createPatient, updatePatient } from '@/actions/patients'
import type { Tables } from '@/types/database'

const MEDICAL_CONDITIONS = [
  'Diabetes', 'Hypertension', 'PCOS', 'Thyroid Disorder',
  'Heart Disease', 'Kidney Disease', 'Liver Disease', 'Other',
]

const FOOD_ALLERGIES = ['Nuts', 'Dairy', 'Gluten', 'Soy', 'Eggs', 'Shellfish', 'Other']

interface PatientFormProps {
  mode: 'create' | 'edit'
  patient?: Tables<'patients'>
  onSuccess?: (patientId: string) => void
}

export function PatientForm({ mode, patient, onSuccess }: PatientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showOptional, setShowOptional] = useState(
    mode === 'edit' &&
      !!(
        patient?.activity_level ||
        patient?.work_type ||
        patient?.dietary_type ||
        patient?.primary_goal ||
        (patient?.medical_conditions?.length ?? 0) > 0 ||
        (patient?.food_allergies?.length ?? 0) > 0
      )
  )
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    patient?.medical_conditions ?? []
  )
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    patient?.food_allergies ?? []
  )

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      full_name: patient?.full_name ?? '',
      phone: patient?.phone ?? '',
      gender: patient?.gender ?? undefined,
      date_of_birth: patient?.date_of_birth ?? '',
      height_cm: patient?.height_cm ?? undefined,
      weight_kg: patient?.weight_kg ?? undefined,
      activity_level: patient?.activity_level ?? undefined,
      sleep_hours: patient?.sleep_hours ?? undefined,
      work_type: patient?.work_type ?? undefined,
      dietary_type: patient?.dietary_type ?? undefined,
      primary_goal: patient?.primary_goal ?? undefined,
    },
  })

  const toggleCondition = (v: string) =>
    setSelectedConditions((prev) =>
      prev.includes(v) ? prev.filter((c) => c !== v) : [...prev, v]
    )

  const toggleAllergy = (v: string) =>
    setSelectedAllergies((prev) =>
      prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]
    )

  const onSubmit = (data: CreatePatientInput) => {
    startTransition(async () => {
      const payload: CreatePatientInput = {
        ...data,
        medical_conditions: selectedConditions,
        food_allergies: selectedAllergies,
      }

      if (mode === 'create') {
        const result = await createPatient(payload)
        if (result.error) {
          setError('root', { message: result.error })
          return
        }
        toast.success('Patient created successfully!')
        if (onSuccess && result.patientId) {
          onSuccess(result.patientId)
        } else {
          router.push(`/patients/${result.patientId}`)
        }
      } else if (patient) {
        const result = await updatePatient(patient.id, payload)
        if (result.error) {
          setError('root', { message: result.error })
          return
        }
        toast.success('Patient updated!')
        if (onSuccess) {
          onSuccess(patient.id)
        } else {
          router.push(`/patients/${patient.id}`)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      {/* ── Required Fields ─────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Basic Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Enter full name"
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              placeholder="e.g. 9999988888"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              {...register('date_of_birth')}
            />
          </div>

          {/* Height */}
          <div className="space-y-1.5">
            <Label htmlFor="height_cm">Height (cm)</Label>
            <Input
              id="height_cm"
              type="number"
              placeholder="e.g. 165"
              {...register('height_cm', { valueAsNumber: true })}
            />
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">Weight (kg)</Label>
            <Input
              id="weight_kg"
              type="number"
              step="0.1"
              placeholder="e.g. 65"
              {...register('weight_kg', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* ── Optional Health Details ──────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          <span>Health Details <span className="text-muted-foreground font-normal">(optional)</span></span>
          {showOptional ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showOptional && (
          <div className="px-5 pb-5 space-y-5 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
              {/* Activity Level */}
              <div className="space-y-1.5">
                <Label>Activity Level</Label>
                <Controller
                  control={control}
                  name="activity_level"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select activity level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="lightly_active">Lightly Active</SelectItem>
                        <SelectItem value="highly_active">Highly Active</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Sleep Hours */}
              <div className="space-y-1.5">
                <Label htmlFor="sleep_hours">Sleep Hours / Night</Label>
                <Input
                  id="sleep_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="e.g. 7"
                  {...register('sleep_hours', { valueAsNumber: true })}
                />
              </div>

              {/* Work Type */}
              <div className="space-y-1.5">
                <Label>Work Type</Label>
                <Controller
                  control={control}
                  name="work_type"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desk_job">Desk Job</SelectItem>
                        <SelectItem value="field_work">Field Work</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Dietary Type */}
              <div className="space-y-1.5">
                <Label>Dietary Type</Label>
                <Controller
                  control={control}
                  name="dietary_type"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select dietary type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="non_vegetarian">Non-Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="eggitarian">Eggitarian</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Primary Goal */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Primary Goal</Label>
                <Controller
                  control={control}
                  name="primary_goal"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select primary goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight_loss">Weight Loss</SelectItem>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="condition_management">Condition Management</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Medical Conditions */}
            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <div className="flex flex-wrap gap-2">
                {MEDICAL_CONDITIONS.map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selectedConditions.includes(cond)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-background border-border text-muted-foreground hover:border-emerald-400'
                    )}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Allergies */}
            <div className="space-y-2">
              <Label>Food Allergies</Label>
              <div className="flex flex-wrap gap-2">
                {FOOD_ALLERGIES.map((allergy) => (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => toggleAllergy(allergy)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selectedAllergies.includes(allergy)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-background border-border text-muted-foreground hover:border-emerald-400'
                    )}
                  >
                    {allergy}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Patient' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
