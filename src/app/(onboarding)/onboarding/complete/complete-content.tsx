'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, User, Stethoscope, MapPin, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { completeOnboarding } from '@/actions/onboarding'
import { SPECIALIZATIONS } from '@/lib/constants/specializations'

const PRACTICE_TYPE_LABELS: Record<string, string> = {
  online_only: 'Online Only',
  clinic_only: 'Clinic / Physical',
  both: 'Online & Clinic',
}

interface CompleteContentProps {
  dietitian: {
    full_name: string
    photo_url?: string | null
    primary_practice_location?: string | null
  }
  professional?: {
    primary_qualification?: string | null
    specializations?: string[] | null
  } | null
  practice?: {
    practice_type?: string | null
    online_consultation_fee?: number | null
    clinic_consultation_fee?: number | null
  } | null
}

export function CompleteContent({ dietitian, professional, practice }: CompleteContentProps) {
  const [isPending, startTransition] = useTransition()

  const handleGoToDashboard = () => {
    startTransition(async () => {
      await completeOnboarding()
    })
  }

  const initials = dietitian.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const specLabels = (professional?.specializations ?? [])
    .map((s) => SPECIALIZATIONS.find((sp) => sp.value === s)?.label ?? s)
    .slice(0, 4)

  const fee = practice?.practice_type === 'online_only'
    ? practice.online_consultation_fee
    : practice?.practice_type === 'clinic_only'
    ? practice.clinic_consultation_fee
    : practice?.online_consultation_fee ?? practice?.clinic_consultation_fee

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Success icon + message */}
      <div className="text-center space-y-4 py-4">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Setup Complete! 🎉</h1>
          <p className="mt-2 text-muted-foreground">
            Your dietitian profile has been successfully created.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now start managing patients and appointments.
          </p>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Profile Summary
        </h2>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={dietitian.photo_url ?? undefined} />
            <AvatarFallback className="text-xl bg-emerald-100 text-emerald-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{dietitian.full_name}</p>
            {professional?.primary_qualification && (
              <p className="text-sm text-muted-foreground">{professional.primary_qualification}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm">
          {dietitian.primary_practice_location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {dietitian.primary_practice_location}
            </div>
          )}
          {practice?.practice_type && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="h-4 w-4 shrink-0" />
              {PRACTICE_TYPE_LABELS[practice.practice_type] ?? practice.practice_type}
            </div>
          )}
          {fee && Number(fee) > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IndianRupee className="h-4 w-4 shrink-0" />
              ₹{Number(fee).toLocaleString('en-IN')} per consultation
            </div>
          )}
        </div>

        {specLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {specLabels.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
            {(professional?.specializations?.length ?? 0) > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{(professional!.specializations!.length) - 4} more
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Quick setup recommendations */}
      <div className="rounded-2xl border bg-muted/30 px-5 py-4 space-y-3">
        <h2 className="text-sm font-semibold">Quick Setup Recommendations</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            Upload your professional certificates for better credibility
          </li>
          <li className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            Complete your profile for better patient visibility
          </li>
          <li className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            Review your availability schedule before accepting bookings
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="flex-1" onClick={handleGoToDashboard} disabled={isPending}>
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading…</>
          ) : (
            'Go to Dashboard →'
          )}
        </Button>
        <Link href="/profile">
          <Button variant="outline">Edit Profile</Button>
        </Link>
      </div>
    </div>
  )
}
