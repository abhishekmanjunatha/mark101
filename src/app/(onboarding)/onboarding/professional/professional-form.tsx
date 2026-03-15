'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { OnboardingHeader } from '@/components/onboarding/onboarding-header'
import { professionalSchema, type ProfessionalInput } from '@/lib/validations/onboarding'
import { SPECIALIZATIONS } from '@/lib/constants/specializations'
import { saveProfessionalDetails } from '@/actions/onboarding'

const EXPERIENCE_OPTIONS = [
  { value: '0-1', label: '0–1 years' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
]

interface ProfessionalFormProps {
  defaultValues?: Partial<ProfessionalInput>
}

export function ProfessionalForm({ defaultValues }: ProfessionalFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Multi-entry state for certifications
  const [certifications, setCertifications] = useState<string[]>(
    defaultValues?.additional_certifications?.length
      ? defaultValues.additional_certifications
      : ['']
  )

  // Multi-entry state for education
  const [education, setEducation] = useState<
    { degree: string; institution: string; graduation_year: string }[]
  >(
    defaultValues?.education?.length
      ? (defaultValues.education as { degree: string; institution: string; graduation_year: string }[])
      : []
  )

  // Selected specializations
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(
    defaultValues?.specializations ?? []
  )

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      primary_qualification: defaultValues?.primary_qualification ?? '',
      years_of_experience: defaultValues?.years_of_experience,
      registration_number: defaultValues?.registration_number ?? '',
      additional_certifications: certifications,
      specializations: selectedSpecs,
      education: [],
    },
  })

  const toggleSpec = (value: string) => {
    const next = selectedSpecs.includes(value)
      ? selectedSpecs.filter((s) => s !== value)
      : [...selectedSpecs, value]
    setSelectedSpecs(next)
    setValue('specializations', next)
  }

  const addCert = () => setCertifications((p) => [...p, ''])
  const removeCert = (i: number) => {
    const next = certifications.filter((_, idx) => idx !== i)
    setCertifications(next)
    setValue('additional_certifications', next)
  }
  const updateCert = (i: number, val: string) => {
    const next = certifications.map((c, idx) => (idx === i ? val : c))
    setCertifications(next)
    setValue('additional_certifications', next)
  }

  const addEducation = () =>
    setEducation((p) => [...p, { degree: '', institution: '', graduation_year: '' }])
  const removeEducation = (i: number) => setEducation((p) => p.filter((_, idx) => idx !== i))
  const updateEducation = (
    i: number,
    field: 'degree' | 'institution' | 'graduation_year',
    val: string
  ) => {
    setEducation((p) => p.map((e, idx) => (idx === i ? { ...e, [field]: val } : e)))
  }

  const onSubmit = (data: ProfessionalInput, action: 'continue' | 'draft') => {
    startTransition(async () => {
      const payload: ProfessionalInput = {
        ...data,
        additional_certifications: certifications.filter(Boolean),
        specializations: selectedSpecs,
        education: education.filter((e) => e.degree && e.institution && e.graduation_year),
      }
      const result = await saveProfessionalDetails(payload)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      if (action === 'draft') {
        toast.success('Progress saved!')
        router.push('/dashboard')
      } else {
        router.push('/onboarding/practice')
      }
    })
  }

  return (
    <div>
      <OnboardingHeader
        currentStep={2}
        title="Professional Details"
        description="Provide your qualifications and experience so patients can trust your expertise."
      />

      <form
        onSubmit={handleSubmit((d) => onSubmit(d, 'continue'))}
        className="rounded-2xl border bg-card p-6 shadow-sm space-y-6"
      >
        {errors.root && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.root.message}
          </div>
        )}

        {/* Primary Qualification */}
        <div className="space-y-1.5">
          <Label htmlFor="qualification">
            Primary Qualification <span className="text-destructive">*</span>
          </Label>
          <Input
            id="qualification"
            placeholder="e.g., BSc Nutrition, MSc Dietetics"
            {...register('primary_qualification')}
          />
          {errors.primary_qualification && (
            <p className="text-xs text-destructive">{errors.primary_qualification.message}</p>
          )}
        </div>

        {/* Additional Certifications */}
        <div className="space-y-2">
          <Label>Additional Certifications</Label>
          <div className="space-y-2">
            {certifications.map((cert, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="e.g., Certified Diabetes Educator"
                  value={cert}
                  onChange={(e) => updateCert(i, e.target.value)}
                  className="flex-1"
                />
                {certifications.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCert(i)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCert}
            className="mt-1"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Certification
          </Button>
        </div>

        {/* Years of Experience */}
        <div className="space-y-1.5">
          <Label>Years of Experience <span className="text-destructive">*</span></Label>
          <Select
            defaultValue={defaultValues?.years_of_experience}
            onValueChange={(v) => setValue('years_of_experience', v as ProfessionalInput['years_of_experience'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select experience" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.years_of_experience && (
            <p className="text-xs text-destructive">{errors.years_of_experience.message}</p>
          )}
        </div>

        {/* Specializations */}
        <div className="space-y-2">
          <Label>
            Specializations <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">Select all that apply</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALIZATIONS.map((spec) => (
              <div
                key={spec.value}
                className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSpec(spec.value)}
              >
                <Checkbox
                  checked={selectedSpecs.includes(spec.value)}
                  onCheckedChange={() => toggleSpec(spec.value)}
                  id={`spec-${spec.value}`}
                />
                <label
                  htmlFor={`spec-${spec.value}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {spec.label}
                </label>
              </div>
            ))}
          </div>
          {errors.specializations && (
            <p className="text-xs text-destructive">{errors.specializations.message}</p>
          )}
        </div>

        {/* Registration Number */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-number">Registration Number <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input
            id="reg-number"
            placeholder="Professional registration number"
            {...register('registration_number')}
          />
        </div>

        <Separator />

        {/* Education Details */}
        <div className="space-y-3">
          <div>
            <Label>Education Details</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Add your academic qualifications</p>
          </div>

          {education.map((edu, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Education {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEducation(i)}
                  className="h-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Degree</Label>
                  <Input
                    placeholder="e.g., BSc Nutrition"
                    value={edu.degree}
                    onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Graduation Year</Label>
                  <Input
                    placeholder="e.g., 2018"
                    maxLength={4}
                    value={edu.graduation_year}
                    onChange={(e) => updateEducation(i, 'graduation_year', e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Institution Name</Label>
                  <Input
                    placeholder="e.g., AIIMS Delhi"
                    value={edu.institution}
                    onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addEducation}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Education
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/onboarding/basic-profile')}
            disabled={isPending}
          >
            ← Back
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save and Continue →'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={handleSubmit((d) => onSubmit(d, 'draft'))}
          >
            Save Draft
          </Button>
        </div>
      </form>
    </div>
  )
}
