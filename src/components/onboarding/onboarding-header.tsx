import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { step: 1, label: 'Basic Profile' },
  { step: 2, label: 'Professional' },
  { step: 3, label: 'Clinic & Practice' },
  { step: 4, label: 'Availability' },
]

interface OnboardingHeaderProps {
  currentStep: 1 | 2 | 3 | 4
  title: string
  description: string
}

export function OnboardingHeader({ currentStep, title, description }: OnboardingHeaderProps) {
  const progress = (currentStep / 4) * 100

  return (
    <div className="space-y-6 mb-8">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight">peepal</span>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentStep} of 4
          </span>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-between">
          {STEPS.map((s) => {
            const isCompleted = s.step < currentStep
            const isCurrent = s.step === currentStep
            return (
              <div key={s.step} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                    isCompleted && 'bg-emerald-600 text-white',
                    isCurrent && 'bg-emerald-600 text-white ring-4 ring-emerald-600/20',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.step
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium hidden sm:block',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Title + description */}
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
