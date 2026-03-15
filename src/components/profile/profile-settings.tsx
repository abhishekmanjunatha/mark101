'use client'

import { useState, useTransition, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  User, Briefcase, Building2, Calendar, Settings, Loader2, Upload,
  Camera, Plus, Trash2, Eye, Wifi, LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  basicProfileSchema, professionalSchema, practiceSchema, availabilitySchema,
  type BasicProfileInput, type ProfessionalInput, type PracticeInput,
} from '@/lib/validations/onboarding'
import { SPECIALIZATIONS } from '@/lib/constants/specializations'
import { INDIAN_STATES, LANGUAGES } from '@/lib/constants/india'
import { CONSULTATION_DURATIONS, BUFFER_TIMES, DAYS_OF_WEEK } from '@/lib/constants/app'
import { generateSlots } from '@/lib/utils/slots'
import type { SlotDuration, BufferTime, DayAvailability } from '@/types/app'
import type { DayScheduleInput } from '@/lib/validations/onboarding'
import type { Tables } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import {
  updateBasicInfo,
  updateProfessionalDetails,
  updatePracticeDetails,
  updateAvailability,
  changePassword,
} from '@/actions/dietitian'
import { z } from 'zod'

// ── Types ────────────────────────────────────────────────────────────────────

interface ProfileSettingsProps {
  dietitian: Tables<'dietitians'>
  professional: Tables<'dietitian_professional'> | null
  practice: Tables<'dietitian_practice'> | null
  availability: Tables<'dietitian_availability'>[]
  email: string
}

const EXPERIENCE_OPTIONS = [
  { value: '0-1', label: '0–1 years' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
]

const PRACTICE_TYPES = [
  { value: 'online_only' as const, label: 'Online Only', description: 'Video & chat consultations', icon: Wifi },
  { value: 'clinic_only' as const, label: 'Clinic / Physical', description: 'In-person consultations', icon: Building2 },
  { value: 'both' as const, label: 'Both', description: 'Online & in-person', icon: LayoutGrid },
]

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const DEFAULT_SLOT = { start: '09:00', end: '17:00' }

const passwordSchema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

// ── Main Component ──────────────────────────────────────────────────────────

export function ProfileSettings({
  dietitian, professional, practice, availability, email,
}: ProfileSettingsProps) {
  const router = useRouter()

  return (
    <Tabs defaultValue="basic" className="space-y-6">
      <TabsList className="w-full grid grid-cols-5">
        <TabsTrigger value="basic" className="gap-1.5 text-xs sm:text-sm">
          <User className="h-3.5 w-3.5 hidden sm:block" /> Basic
        </TabsTrigger>
        <TabsTrigger value="professional" className="gap-1.5 text-xs sm:text-sm">
          <Briefcase className="h-3.5 w-3.5 hidden sm:block" /> Professional
        </TabsTrigger>
        <TabsTrigger value="practice" className="gap-1.5 text-xs sm:text-sm">
          <Building2 className="h-3.5 w-3.5 hidden sm:block" /> Practice
        </TabsTrigger>
        <TabsTrigger value="availability" className="gap-1.5 text-xs sm:text-sm">
          <Calendar className="h-3.5 w-3.5 hidden sm:block" /> Availability
        </TabsTrigger>
        <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm">
          <Settings className="h-3.5 w-3.5 hidden sm:block" /> Account
        </TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        <BasicInfoTab dietitian={dietitian} email={email} onSaved={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="professional">
        <ProfessionalTab professional={professional} onSaved={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="practice">
        <PracticeTab practice={practice} onSaved={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="availability">
        <AvailabilityTab availability={availability} onSaved={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="account">
        <AccountTab email={email} />
      </TabsContent>
    </Tabs>
  )
}

// ── Section 1: Basic Information ────────────────────────────────────────────

function BasicInfoTab({ dietitian, email, onSaved }: {
  dietitian: Tables<'dietitians'>; email: string; onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [photoUrl, setPhotoUrl] = useState(dietitian.photo_url ?? '')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bioLength, setBioLength] = useState(dietitian.short_bio?.length ?? 0)

  const {
    register, handleSubmit, setValue, setError, formState: { errors },
  } = useForm<BasicProfileInput>({
    resolver: zodResolver(basicProfileSchema),
    defaultValues: {
      full_name: dietitian.full_name ?? '',
      phone: dietitian.phone ?? '',
      date_of_birth: dietitian.date_of_birth ?? '',
      gender: dietitian.gender ?? undefined,
      primary_practice_location: dietitian.primary_practice_location ?? '',
      short_bio: dietitian.short_bio ?? '',
      photo_url: dietitian.photo_url ?? '',
    },
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB'); return }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Only JPG, PNG, or WebP images are allowed'); return }

    setIsUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${dietitian.id}/profile.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed: ' + error.message); setIsUploading(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${urlData.publicUrl}?t=${Date.now()}`
    setPhotoUrl(url)
    setValue('photo_url', url)
    setIsUploading(false)
    toast.success('Photo uploaded!')
  }

  const onSubmit = (data: BasicProfileInput) => {
    startTransition(async () => {
      const result = await updateBasicInfo({ ...data, photo_url: photoUrl })
      if (result?.error) { setError('root', { message: result.error }); return }
      toast.success('Basic information updated!')
      onSaved()
    })
  }

  const initials = (dietitian.full_name ?? 'D').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
      <h2 className="text-lg font-semibold">Basic Information</h2>
      {errors.root && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.root.message}</div>
      )}

      {/* Profile Photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={photoUrl} alt="Profile" />
            <AvatarFallback className="text-lg bg-emerald-100 text-emerald-700">{initials}</AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
          )}
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1.5" /> Upload Photo</>}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP · Max 5 MB</p>
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <Label>Email Address</Label>
        <Input value={email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="p-name">Full Name <span className="text-destructive">*</span></Label>
        <Input id="p-name" {...register('full_name')} />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="p-phone">Phone Number <span className="text-destructive">*</span></Label>
        <Input id="p-phone" type="tel" {...register('phone')} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      {/* DOB */}
      <div className="space-y-1.5">
        <Label htmlFor="p-dob">Date of Birth <span className="text-destructive">*</span></Label>
        <Input id="p-dob" type="date" {...register('date_of_birth')} />
        {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>}
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <Label>Gender <span className="text-destructive">*</span></Label>
        <Select defaultValue={dietitian.gender ?? undefined} onValueChange={(v) => setValue('gender', v as BasicProfileInput['gender'])}>
          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
      </div>

      {/* Practice Location */}
      <div className="space-y-1.5">
        <Label htmlFor="p-location">Primary Practice Location <span className="text-destructive">*</span></Label>
        <Input id="p-location" {...register('primary_practice_location')} />
        {errors.primary_practice_location && <p className="text-xs text-destructive">{errors.primary_practice_location.message}</p>}
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-bio">Short Bio</Label>
          <span className={`text-xs ${bioLength > 280 ? 'text-amber-600' : 'text-muted-foreground'}`}>{bioLength}/300</span>
        </div>
        <Textarea id="p-bio" rows={3} {...register('short_bio', { onChange: (e) => setBioLength(e.target.value.length) })} />
        {errors.short_bio && <p className="text-xs text-destructive">{errors.short_bio.message}</p>}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

// ── Section 2: Professional Details ─────────────────────────────────────────

function ProfessionalTab({ professional, onSaved }: {
  professional: Tables<'dietitian_professional'> | null; onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [certifications, setCertifications] = useState<string[]>(
    professional?.additional_certifications?.length ? professional.additional_certifications as string[] : ['']
  )
  const [education, setEducation] = useState<{ degree: string; institution: string; graduation_year: string }[]>(
    (professional?.education as { degree: string; institution: string; graduation_year: string }[]) ?? []
  )
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(
    (professional?.specializations as string[]) ?? []
  )

  const {
    register, handleSubmit, setValue, setError, formState: { errors },
  } = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      primary_qualification: professional?.primary_qualification ?? '',
      years_of_experience: professional?.years_of_experience as ProfessionalInput['years_of_experience'] ?? undefined,
      registration_number: professional?.registration_number ?? '',
      additional_certifications: certifications,
      specializations: selectedSpecs,
      education: [],
    },
  })

  const toggleSpec = (value: string) => {
    const next = selectedSpecs.includes(value) ? selectedSpecs.filter((s) => s !== value) : [...selectedSpecs, value]
    setSelectedSpecs(next)
    setValue('specializations', next)
  }

  const addCert = () => setCertifications((p) => [...p, ''])
  const removeCert = (i: number) => { const next = certifications.filter((_, idx) => idx !== i); setCertifications(next); setValue('additional_certifications', next) }
  const updateCert = (i: number, val: string) => { const next = certifications.map((c, idx) => (idx === i ? val : c)); setCertifications(next); setValue('additional_certifications', next) }

  const addEducation = () => setEducation((p) => [...p, { degree: '', institution: '', graduation_year: '' }])
  const removeEducation = (i: number) => setEducation((p) => p.filter((_, idx) => idx !== i))
  const updateEducation = (i: number, field: 'degree' | 'institution' | 'graduation_year', val: string) => {
    setEducation((p) => p.map((e, idx) => (idx === i ? { ...e, [field]: val } : e)))
  }

  const onSubmit = (data: ProfessionalInput) => {
    startTransition(async () => {
      const result = await updateProfessionalDetails({
        ...data,
        additional_certifications: certifications.filter(Boolean),
        specializations: selectedSpecs,
        education: education.filter((e) => e.degree && e.institution && e.graduation_year),
      })
      if (result?.error) { setError('root', { message: result.error }); return }
      toast.success('Professional details updated!')
      onSaved()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <h2 className="text-lg font-semibold">Professional Details</h2>
      {errors.root && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.root.message}</div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="p-qual">Primary Qualification <span className="text-destructive">*</span></Label>
        <Input id="p-qual" placeholder="e.g., BSc Nutrition, MSc Dietetics" {...register('primary_qualification')} />
        {errors.primary_qualification && <p className="text-xs text-destructive">{errors.primary_qualification.message}</p>}
      </div>

      {/* Certifications */}
      <div className="space-y-2">
        <Label>Additional Certifications</Label>
        <div className="space-y-2">
          {certifications.map((cert, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="e.g., Certified Diabetes Educator" value={cert} onChange={(e) => updateCert(i, e.target.value)} className="flex-1" />
              {certifications.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCert(i)} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCert} className="mt-1">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Certification
        </Button>
      </div>

      {/* Experience */}
      <div className="space-y-1.5">
        <Label>Years of Experience <span className="text-destructive">*</span></Label>
        <Select defaultValue={professional?.years_of_experience ?? undefined} onValueChange={(v) => setValue('years_of_experience', v as ProfessionalInput['years_of_experience'])}>
          <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
          <SelectContent>
            {EXPERIENCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.years_of_experience && <p className="text-xs text-destructive">{errors.years_of_experience.message}</p>}
      </div>

      {/* Specializations */}
      <div className="space-y-2">
        <Label>Specializations <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-2 gap-2">
          {SPECIALIZATIONS.map((spec) => (
            <div key={spec.value} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSpec(spec.value)}>
              <Checkbox checked={selectedSpecs.includes(spec.value)} onCheckedChange={() => toggleSpec(spec.value)} id={`pspec-${spec.value}`} />
              <label htmlFor={`pspec-${spec.value}`} className="text-sm cursor-pointer flex-1">{spec.label}</label>
            </div>
          ))}
        </div>
        {errors.specializations && <p className="text-xs text-destructive">{errors.specializations.message}</p>}
      </div>

      {/* Registration Number */}
      <div className="space-y-1.5">
        <Label htmlFor="p-reg">Registration Number <span className="text-xs text-muted-foreground">(optional)</span></Label>
        <Input id="p-reg" {...register('registration_number')} />
      </div>

      <Separator />

      {/* Education */}
      <div className="space-y-3">
        <div>
          <Label>Education Details</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Add your academic qualifications</p>
        </div>
        {education.map((edu, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Education {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeEducation(i)} className="h-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Degree</Label>
                <Input placeholder="e.g., BSc Nutrition" value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Graduation Year</Label>
                <Input placeholder="e.g., 2018" maxLength={4} value={edu.graduation_year} onChange={(e) => updateEducation(i, 'graduation_year', e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Institution Name</Label>
                <Input placeholder="e.g., AIIMS Delhi" value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addEducation}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Education
        </Button>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

// ── Section 3: Practice Details ─────────────────────────────────────────────

function PracticeTab({ practice, onSaved }: {
  practice: Tables<'dietitian_practice'> | null; onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    (practice?.languages as string[]) ?? []
  )

  const {
    register, handleSubmit, setValue, watch, setError, formState: { errors },
  } = useForm<PracticeInput>({
    resolver: zodResolver(practiceSchema),
    defaultValues: {
      practice_type: practice?.practice_type as PracticeInput['practice_type'] ?? undefined,
      clinic_name: practice?.clinic_name ?? '',
      practice_address: practice?.practice_address ?? '',
      city: practice?.city ?? '',
      state: practice?.state ?? '',
      pincode: practice?.pincode ?? '',
      online_consultation_fee: Number(practice?.online_consultation_fee ?? 0),
      clinic_consultation_fee: Number(practice?.clinic_consultation_fee ?? 0),
      consultation_duration: practice?.consultation_duration ?? 30,
      languages: (practice?.languages as string[]) ?? [],
    },
  })

  const practiceType = watch('practice_type')
  const showOnlineFee = practiceType === 'online_only' || practiceType === 'both'
  const showClinicFields = practiceType === 'clinic_only' || practiceType === 'both'

  const toggleLanguage = (val: string) => {
    const next = selectedLanguages.includes(val) ? selectedLanguages.filter((l) => l !== val) : [...selectedLanguages, val]
    setSelectedLanguages(next)
    setValue('languages', next)
  }

  const onSubmit = (data: PracticeInput) => {
    startTransition(async () => {
      const result = await updatePracticeDetails({
        ...data,
        languages: selectedLanguages,
        online_consultation_fee: data.online_consultation_fee ?? 0,
        clinic_consultation_fee: data.clinic_consultation_fee ?? 0,
      })
      if (result?.error) { setError('root', { message: result.error }); return }
      toast.success('Practice details updated!')
      onSaved()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <h2 className="text-lg font-semibold">Clinic / Practice Details</h2>
      {errors.root && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.root.message}</div>
      )}

      {/* Practice Type */}
      <div className="space-y-2">
        <Label>Practice Type <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRACTICE_TYPES.map((pt) => {
            const Icon = pt.icon
            const isSelected = practiceType === pt.value
            return (
              <button key={pt.value} type="button" onClick={() => setValue('practice_type', pt.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all',
                  isSelected ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                )}>
                <Icon className={cn('h-6 w-6', isSelected ? 'text-emerald-600' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{pt.label}</span>
                <span className="text-xs text-muted-foreground">{pt.description}</span>
              </button>
            )
          })}
        </div>
        {errors.practice_type && <p className="text-xs text-destructive">{errors.practice_type.message}</p>}
      </div>

      {/* Clinic fields */}
      {showClinicFields && (
        <>
          <Separator />
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Clinic Information</p>
            <div className="space-y-1.5">
              <Label htmlFor="p-cname">Clinic / Practice Name <span className="text-destructive">*</span></Label>
              <Input id="p-cname" {...register('clinic_name')} />
              {errors.clinic_name && <p className="text-xs text-destructive">{errors.clinic_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-addr">Practice Address <span className="text-destructive">*</span></Label>
              <Textarea id="p-addr" rows={2} {...register('practice_address')} />
              {errors.practice_address && <p className="text-xs text-destructive">{errors.practice_address.message}</p>}
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
            <Label htmlFor="p-city">City <span className="text-destructive">*</span></Label>
            <Input id="p-city" {...register('city')} />
            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-pincode">Pincode <span className="text-destructive">*</span></Label>
            <Input id="p-pincode" maxLength={6} inputMode="numeric" {...register('pincode')} />
            {errors.pincode && <p className="text-xs text-destructive">{errors.pincode.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>State <span className="text-destructive">*</span></Label>
          <Select defaultValue={practice?.state ?? undefined} onValueChange={(v) => setValue('state', v ?? '')}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
              <Label htmlFor="p-ofee">Online Consultation</Label>
              <Input id="p-ofee" type="number" min={0} {...register('online_consultation_fee', { valueAsNumber: true })} />
            </div>
          )}
          {showClinicFields && (
            <div className="space-y-1.5">
              <Label htmlFor="p-cfee">Clinic Consultation</Label>
              <Input id="p-cfee" type="number" min={0} {...register('clinic_consultation_fee', { valueAsNumber: true })} />
            </div>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label>Consultation Duration <span className="text-destructive">*</span></Label>
        <Select defaultValue={String(practice?.consultation_duration ?? 30)} onValueChange={(v) => setValue('consultation_duration', Number(v))}>
          <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
          <SelectContent>
            {CONSULTATION_DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.consultation_duration && <p className="text-xs text-destructive">{errors.consultation_duration.message}</p>}
      </div>

      {/* Languages */}
      <div className="space-y-2">
        <Label>Languages Spoken <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => (
            <div key={lang.value} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleLanguage(lang.value)}>
              <Checkbox checked={selectedLanguages.includes(lang.value)} onCheckedChange={() => toggleLanguage(lang.value)} id={`plang-${lang.value}`} />
              <label htmlFor={`plang-${lang.value}`} className="text-sm cursor-pointer">{lang.label}</label>
            </div>
          ))}
        </div>
        {errors.languages && <p className="text-xs text-destructive">{errors.languages.message}</p>}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

// ── Section 4: Availability ─────────────────────────────────────────────────

function AvailabilityTab({ availability, onSaved }: {
  availability: Tables<'dietitian_availability'>[]; onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  const existingByDay: Record<string, DayScheduleInput> = {}
  let initSlotDuration = 30
  let initBufferTime = 0
  if (availability.length > 0) {
    initSlotDuration = availability[0].slot_duration
    initBufferTime = availability[0].buffer_time
    for (const row of availability) {
      existingByDay[row.day_of_week] = {
        day: row.day_of_week as DayScheduleInput['day'],
        is_available: row.is_available,
        time_slots: (row.time_slots as { start: string; end: string }[]) ?? [],
      }
    }
  }

  const [days, setDays] = useState<DayScheduleInput[]>(() =>
    DAYS_OF_WEEK.map((day) => existingByDay[day] ?? {
      day: day as DayScheduleInput['day'],
      is_available: !['saturday', 'sunday'].includes(day),
      time_slots: !['saturday', 'sunday'].includes(day) ? [{ ...DEFAULT_SLOT }] : [],
    })
  )
  const [slotDuration, setSlotDuration] = useState(initSlotDuration)
  const [bufferTime, setBufferTime] = useState(initBufferTime)

  const previewSlots = useMemo(() => {
    const firstAvailable = days.find((d) => d.is_available && d.time_slots.length > 0)
    if (!firstAvailable) return []
    const avail: DayAvailability = { day: firstAvailable.day, available: true, slots: firstAvailable.time_slots }
    return generateSlots(avail, slotDuration as SlotDuration, bufferTime as BufferTime)
  }, [days, slotDuration, bufferTime])

  const updateDay = (dayIdx: number, field: 'is_available' | 'time_slots', value: boolean | { start: string; end: string }[]) => {
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d
      if (field === 'is_available') {
        const isAvail = value as boolean
        return { ...d, is_available: isAvail, time_slots: isAvail && d.time_slots.length === 0 ? [{ ...DEFAULT_SLOT }] : d.time_slots }
      }
      return { ...d, time_slots: value as { start: string; end: string }[] }
    }))
  }

  const addSlot = (dayIdx: number) => {
    setDays((prev) => prev.map((d, i) => i === dayIdx ? { ...d, time_slots: [...d.time_slots, { start: '09:00', end: '17:00' }] } : d))
  }

  const removeSlot = (dayIdx: number, slotIdx: number) => {
    setDays((prev) => prev.map((d, i) => i === dayIdx ? { ...d, time_slots: d.time_slots.filter((_, si) => si !== slotIdx) } : d))
  }

  const updateSlot = (dayIdx: number, slotIdx: number, field: 'start' | 'end', value: string) => {
    setDays((prev) => prev.map((d, i) => i === dayIdx ? { ...d, time_slots: d.time_slots.map((s, si) => si === slotIdx ? { ...s, [field]: value } : s) } : d))
  }

  const handleSave = () => {
    const result = availabilitySchema.safeParse({
      days, slot_duration: slotDuration, buffer_time: bufferTime,
    })
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Please fix the errors')
      return
    }
    setFormError(null)
    startTransition(async () => {
      const res = await updateAvailability(result.data)
      if (res?.error) { setFormError(res.error); return }
      toast.success('Availability updated!')
      onSaved()
    })
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b">
        <h2 className="text-lg font-semibold">Weekly Availability</h2>
        <p className="text-sm text-muted-foreground mt-1">Changes affect appointment slot generation</p>
      </div>

      {/* Slot settings */}
      <div className="px-6 py-5 border-b bg-muted/30">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Slot Duration</Label>
            <Select value={String(slotDuration)} onValueChange={(v) => setSlotDuration(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONSULTATION_DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Buffer Between Appointments</Label>
            <Select value={String(bufferTime)} onValueChange={(v) => setBufferTime(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUFFER_TIMES.map((b) => <SelectItem key={b} value={String(b)}>{b === 0 ? 'No buffer' : `${b} minutes`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="divide-y">
        {days.map((day, dayIdx) => (
          <div key={day.day} className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch checked={day.is_available} onCheckedChange={(v) => updateDay(dayIdx, 'is_available', v)} id={`ptoggle-${day.day}`} />
                <label htmlFor={`ptoggle-${day.day}`} className={cn('text-sm font-medium cursor-pointer', !day.is_available && 'text-muted-foreground')}>
                  {DAY_LABELS[day.day]}
                </label>
              </div>
              {!day.is_available && <Badge variant="secondary" className="text-xs">Unavailable</Badge>}
            </div>
            {day.is_available && (
              <div className="ml-8 space-y-2">
                {day.time_slots.map((slot, si) => (
                  <div key={si} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={slot.start} onChange={(e) => updateSlot(dayIdx, si, 'start', e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      <span className="text-muted-foreground text-sm">to</span>
                      <input type="time" value={slot.end} onChange={(e) => updateSlot(dayIdx, si, 'end', e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    </div>
                    {day.time_slots.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(dayIdx, si)} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => addSlot(dayIdx)} className="text-muted-foreground h-7 px-2 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add time slot
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview */}
      {previewSlots.length > 0 && (
        <div className="px-6 py-5 border-t bg-muted/30">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowPreview((v) => !v)}>
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Slot Preview</span>
            <span className="text-xs text-muted-foreground ml-auto">{previewSlots.length} slots generated for first available day</span>
          </div>
          {showPreview && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previewSlots.map((s) => <Badge key={s} variant="outline" className="text-xs font-mono">{s}</Badge>)}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {formError && (
        <div className="mx-6 mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
      )}

      {/* Actions */}
      <div className="px-6 py-5 border-t flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Availability'}
        </Button>
      </div>
    </div>
  )
}

// ── Section 5: Account Settings ─────────────────────────────────────────────

function AccountTab({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition()

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<{ new_password: string; confirm_password: string }>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmit = (data: { new_password: string; confirm_password: string }) => {
    startTransition(async () => {
      const result = await changePassword(data.new_password)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Password changed successfully!')
      reset()
    })
  }

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold">Change Password</h2>

        <div className="space-y-1.5">
          <Label htmlFor="p-newpw">New Password</Label>
          <Input id="p-newpw" type="password" placeholder="Min 8 characters" {...register('new_password')} />
          {errors.new_password && <p className="text-xs text-destructive">{errors.new_password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-confirmpw">Confirm Password</Label>
          <Input id="p-confirmpw" type="password" placeholder="Re-enter new password" {...register('confirm_password')} />
          {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password.message}</p>}
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating…</> : 'Update Password'}
        </Button>
      </form>

      {/* Account Info */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Account Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{email}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
