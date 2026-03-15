import type { Metadata } from 'next'
import { getPatients } from '@/actions/patients'
import { PatientsList } from '@/components/patients/patients-list'

export const metadata: Metadata = { title: 'Patients' }

interface PatientsPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const { q } = await searchParams
  const patients = await getPatients(q)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">Patients</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {patients.length} patient{patients.length !== 1 ? 's' : ''} total
        </p>
      </div>
      <PatientsList patients={patients} searchQuery={q ?? ''} />
    </div>
  )
}
