import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPatient } from '@/actions/patients'
import { PatientForm } from '@/components/patients/patient-form'

interface EditPatientPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = { title: 'Edit Patient' }

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const { id } = await params
  const patient = await getPatient(id)

  if (!patient) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit Patient</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{patient.full_name} · {patient.patient_code}</p>
      </div>
      <PatientForm mode="edit" patient={patient} />
    </div>
  )
}
