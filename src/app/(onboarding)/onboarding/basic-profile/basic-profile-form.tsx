'use client'

import { useState, useTransition, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Upload } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { OnboardingHeader } from '@/components/onboarding/onboarding-header'
import { basicProfileSchema, type BasicProfileInput } from '@/lib/validations/onboarding'
import { saveBasicProfile } from '@/actions/onboarding'
import { createClient } from '@/lib/supabase/client'

interface BasicProfileFormProps {
  defaultValues?: Partial<BasicProfileInput> & { email?: string }
  userId: string
}

export function BasicProfileForm({ defaultValues, userId }: BasicProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [photoUrl, setPhotoUrl] = useState(defaultValues?.photo_url ?? '')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bioLength, setBioLength] = useState(defaultValues?.short_bio?.length ?? 0)

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<BasicProfileInput>({
    resolver: zodResolver(basicProfileSchema),
    defaultValues: {
      full_name: defaultValues?.full_name ?? '',
      phone: defaultValues?.phone ?? '',
      date_of_birth: defaultValues?.date_of_birth ?? '',
      gender: defaultValues?.gender,
      primary_practice_location: defaultValues?.primary_practice_location ?? '',
      short_bio: defaultValues?.short_bio ?? '',
      photo_url: defaultValues?.photo_url ?? '',
    },
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images are allowed')
      return
    }

    setIsUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/profile.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      toast.error('Upload failed: ' + error.message)
      setIsUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${urlData.publicUrl}?t=${Date.now()}`
    setPhotoUrl(url)
    setValue('photo_url', url)
    setIsUploading(false)
    toast.success('Photo uploaded!')
  }

  const onSubmit = (data: BasicProfileInput, action: 'continue' | 'draft') => {
    startTransition(async () => {
      const result = await saveBasicProfile({ ...data, photo_url: photoUrl })
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      if (action === 'draft') {
        toast.success('Progress saved!')
        router.push('/dashboard')
      } else {
        router.push('/onboarding/professional')
      }
    })
  }

  const initials = (defaultValues?.full_name ?? 'D')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div>
      <OnboardingHeader
        currentStep={1}
        title="Basic Profile Information"
        description="Tell us a little about yourself so patients can identify and connect with you."
      />

      <form
        onSubmit={handleSubmit((d) => onSubmit(d, 'continue'))}
        className="rounded-2xl border bg-card p-6 shadow-sm space-y-5"
      >
        {errors.root && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.root.message}
          </div>
        )}

        {/* Profile Photo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={photoUrl} alt="Profile" />
              <AvatarFallback className="text-lg bg-emerald-100 text-emerald-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-4 w-4 mr-1.5" /> Upload Photo</>
              )}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP · Max 5 MB · Optional</p>
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Full Name <span className="text-destructive">*</span></Label>
          <Input id="full-name" placeholder="Enter your full name" {...register('full_name')} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
          <Input id="phone" type="tel" placeholder="+91 98765 43210" {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        {/* Date of Birth */}
        <div className="space-y-1.5">
          <Label htmlFor="dob">Date of Birth <span className="text-destructive">*</span></Label>
          <Input id="dob" type="date" {...register('date_of_birth')} />
          {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth.message}</p>}
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label>Gender <span className="text-destructive">*</span></Label>
          <Select
            defaultValue={defaultValues?.gender}
            onValueChange={(v) => setValue('gender', v as BasicProfileInput['gender'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
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
          <Label htmlFor="location">Primary Practice Location <span className="text-destructive">*</span></Label>
          <Input
            id="location"
            placeholder="City / Area where you practice"
            {...register('primary_practice_location')}
          />
          {errors.primary_practice_location && (
            <p className="text-xs text-destructive">{errors.primary_practice_location.message}</p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">Short Bio</Label>
            <span className={`text-xs ${bioLength > 280 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {bioLength}/300
            </span>
          </div>
          <Textarea
            id="bio"
            rows={3}
            placeholder="Briefly describe your expertise or approach to nutrition."
            {...register('short_bio', {
              onChange: (e) => setBioLength(e.target.value.length),
            })}
          />
          {errors.short_bio && <p className="text-xs text-destructive">{errors.short_bio.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
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
