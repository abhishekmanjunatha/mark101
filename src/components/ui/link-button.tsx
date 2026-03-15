'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LinkButtonProps
  extends ComponentProps<typeof Link>,
    VariantProps<typeof buttonVariants> {}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
