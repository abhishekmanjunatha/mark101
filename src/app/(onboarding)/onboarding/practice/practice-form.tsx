'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, Wifi, Building2, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { OnboardingHeader } from '@/components/onboarding/onboarding-header'
import { practiceSchema, type PracticeInput } from '@/lib/validations/onboarding'
import { INDIAN_STATES, LANGUAGES } from '@/lib/constants/india'
import { CONSULTATION_DURATIONS } from '@/lib/constants/app'
import { savePracticeDetails } from '@/actions/onboarding'
import { useState } from 'react'

const PRACTICE_TYPES = [
  {
    value: 'online_only' as const,
    label: 'Online Only',
    description: 'Video & chat consultations',
    icon: Wifi,
  },
  {
    value: 'clinic_only' as const,
    label: 'Clinic / Physical',
    description: 'In-person consultations',
    icon: Building2,
  },
  {
    value: 'both' as const,
    label: 'Both',
    description: 'Online & in-person',
    icon: LayoutGrid,
  },
]

interface PracticeFormProps {
  defaultValues?: Partial<PracticeInput>
}

export function PracticeForm({ defaultValues }: PracticeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    defaultValues?.languages ?? []
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<PracticeInput>({
    resolver: zodResolver(practiceSchema),
    defaultValues: {
      practice_type: defaultValues?.practice_type,
      clinic_name: defaultValues?.clinic_name ?? '',
      practice_address: defaultValues?.practice_address ?? '',
      city: defaultValues?.city ?? '',
      state: defaultValues?.state ?? '',
      pincode: defaultValues?.pincode ?? '',
      online_consultation_fee: defaultValues?.online_consultation_fee ?? 0,
      clinic_consultation_fee: defaultValues?.clinic_consultation_fee ?? 0,
      consultation_duration: defaultValues?.consultation_duration ?? 30,
      languages: defaultValues?.languages ?? [],
    },
  })

  const practiceType = watch('practice_type')
  const showOnlineFee = practiceType === 'online_only' || practiceType === 'both'
  const showClinicFields = practiceType === 'clinic_only' || practiceType === 'both'

  const toggleLanguage = (val: string) => {
    const next = selectedLanguages.includes(val)
      ? selectedLanguages.filter((l) => l !== val)
      : [...selectedLanguages, val]
    setSelectedLanguages(next)
    setValue('languages', next)
  }

  const onSubmit = (data: PracticeInput, action: 'continue' | 'draft') => {
    startTransition(async () => {
      const result = await savePracticeDetails({ ...data, languages: selectedLanguages })
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      if (action === 'draft') {
        toast.success('Progress saved!')
        router.push('/dashboard')
      } else {
        router.push('/onboarding/availability')
      }
    })
  }

  return (
    <div>
      <OnboardingHeader
        currentStep={3}
        title="Clinic / Practice Details"
        description="Provide details about where and how you practice so patients know how to consult you."
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

        {/* Practice Type */}
        <div className="space-y-2">
          <Label>Practice Type <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRACTICE_TYPES.map((pt) => {
              const Icon = pt.icon
              const isSelected = practiceType === pt.value
              return (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setValue('practice_type', pt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all',
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                  )}
                >
                  <Icon className={cn('h-6 w-6', isSelected ? 'text-emerald-600' : 'text-muted-foreground')} />
                  <span className="text-sm font-medium">{pt.label}</span>
                  <span className="text-xs text-muted-foreground">{pt.description}</span>
                </button>
              )
            })}
          </div>
          {errors.practice_type && (
            <p className="text-xs text-destructive">{errors.practice_type.message}</p>
          )}
        </div>

        {/* Clinic fields (conditional) */}
        {showClinicFields && (
          <>
            <Separator />
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Clinic Information</p>

              <div className="space-y-1.5">
                <Label htmlFor="clinic-name">
                  Clinic / Practice Name <span className="text-destructive">*</span>
                </Label>
                <Input id="clinic-name" placeholder="Enter clinic or practice name" {...register('clinic_name')} />
                {errors.clinic_name && (
                  <p className="text-xs text-destructive">{errors.clinic_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">
                  Practice Address <span className="text-destructive">*</span>
                </Label>
                <Textarea id="address" rows={2} placeholder="Enter clinic address" {...register('practice_address')} />
                {errors.practice_address && (
                  <p className="text-xs text-destructive">{errors.practice_address.message}</p>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Location */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Location</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
              <Input id="city" placeholder="Enter city" {...register('city')} />
              {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pincode">Pincode <span className="text-destructive">*</span></Label>
              <Input id="pincode" placeholder="6-digit pincode" maxLength={6} inputMode="numeric" {...register('pincode')} />
              {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>State <span className="text-destructive">*</span></Label>
            <Select
              defaultValue={defaultValues?.state}
              onValueChange={(v) => setValue('state', v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
          </div>
        </div>

        <Separator />

        {/* Fees */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Consultation Fees (₹)</p>
          <div className="grid grid-cols-2 gap-3">
            {showOnlineFee && (
              <div className="space-y-1.5">
                <Label htmlFor="online-fee">Online Consultation</Label>
                <Input
                  id="online-fee"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...register('online_consultation_fee', { valueAsNumber: true })}
                />
              </div>
            )}
            {showClinicFields && (
              <div className="space-y-1.5">
                <Label htmlFor="clinic-fee">Clinic Consultation</Label>
                <Input
                  id="clinic-fee"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...register('clinic_consultation_fee', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <Label>Consultation Duration <span className="text-destructive">*</span></Label>
          <Select
            defaultValue={String(defaultValues?.consultation_duration ?? 30)}
            onValueChange={(v) => setValue('consultation_duration', Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {CONSULTATION_DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.consultation_duration && (
            <p className="text-xs text-destructive">{errors.consultation_duration.message}</p>
          )}
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <Label>Languages Spoken <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => (
              <div
                key={lang.value}
                className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleLanguage(lang.value)}
              >
                <Checkbox
                  checked={selectedLanguages.includes(lang.value)}
                  onCheckedChange={() => toggleLanguage(lang.value)}
                  id={`lang-${lang.value}`}
                />
                <label htmlFor={`lang-${lang.value}`} className="text-sm cursor-pointer">
                  {lang.label}
                </label>
              </div>
            ))}
          </div>
          {errors.languages && (
            <p className="text-xs text-destructive">{errors.languages.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/onboarding/professional')}
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
