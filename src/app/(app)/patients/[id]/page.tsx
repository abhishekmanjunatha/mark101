import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CalendarPlus, FileText, FlaskConical, Pencil, User } from 'lucide-react'
import {
  getPatient,
  getPatientAppointments,
  getPatientClinicalNotes,
  getPatientLabReports,
  getPatientTimeline,
} from '@/actions/patients'
import { PatientProfileTabs } from '@/components/patients/patient-profile-tabs'
import { LinkButton } from '@/components/ui/link-button'

interface PatientProfilePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PatientProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const patient = await getPatient(id)
  return { title: patient ? patient.full_name : 'Patient Profile' }
}

export default async function PatientProfilePage({ params }: PatientProfilePageProps) {
  const { id } = await params

  const [patient, appointments, clinicalNotes, labReports, timeline] = await Promise.all([
    getPatient(id),
    getPatientAppointments(id),
    getPatientClinicalNotes(id),
    getPatientLabReports(id),
    getPatientTimeline(id),
  ])

  if (!patient) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Profile Header ──────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <User className="h-7 w-7" />
          </div>

          {/* Name + ID */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">{patient.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{patient.patient_code}</code>
              <span className="mx-2">·</span>
              {patient.phone}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <LinkButton
              href={`/appointments/new?patient=${patient.id}`}
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CalendarPlus className="h-4 w-4" />
              Add Appointment
            </LinkButton>
            <LinkButton
              href={`/clinical-notes/new?patient=${patient.id}`}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Clinical Document
            </LinkButton>
            <LinkButton
              href={`/lab-reports?patient=${patient.id}`}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <FlaskConical className="h-4 w-4" />
              Lab Report
            </LinkButton>
            <LinkButton
              href={`/patients/${patient.id}/edit`}
              variant="ghost"
              size="sm"
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </LinkButton>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <PatientProfileTabs
        patient={patient}
        appointments={appointments}
        clinicalNotes={clinicalNotes}
        labReports={labReports}
        timeline={timeline}
      />
    </div>
  )
}
