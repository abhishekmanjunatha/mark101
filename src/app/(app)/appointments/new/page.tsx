import type { Metadata } from 'next'
import { CreateAppointmentForm } from '@/components/appointments/create-appointment-form'

export const metadata: Metadata = { title: 'Create Appointment' }

export default function NewAppointmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Appointment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search for a patient or add a new one, then book an appointment slot.
        </p>
      </div>
      <CreateAppointmentForm />
    </div>
  )
}
