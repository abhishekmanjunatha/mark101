import type { Metadata } from 'next'
import { PatientForm } from '@/components/patients/patient-form'

export const metadata: Metadata = { title: 'Add Patient' }

export default function NewPatientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add New Patient</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create a patient record to start managing their nutrition journey.
        </p>
      </div>
      <PatientForm mode="create" />
    </div>
  )
}
