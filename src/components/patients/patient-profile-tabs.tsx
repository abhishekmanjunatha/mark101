'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarPlus,
  FileText,
  FlaskConical,
  User,
  Activity,
  Clock,
  Briefcase,
  Salad,
  HeartPulse,
  ShieldAlert,
  CalendarDays,
  ClipboardList,
  TestTubeDiagonal,
  Pencil,
  ChevronLeft,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

// ── Helpers ───────────────────────────────────────────────────────────────

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  condition_management: 'Condition Management',
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly Active',
  highly_active: 'Highly Active',
}

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-Vegetarian',
  vegan: 'Vegan',
  eggitarian: 'Eggitarian',
}

const WORK_LABELS: Record<string, string> = {
  desk_job: 'Desk Job',
  field_work: 'Field Work',
  other: 'Other',
}

const STATUS_CFG: Record<string, { label: string; cn: string }> = {
  upcoming: { label: 'Upcoming', cn: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', cn: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', cn: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', cn: 'bg-red-100 text-red-600 border-red-200' },
}

const PURPOSE_LABELS: Record<string, string> = {
  new_consultation: 'New Consultation',
  follow_up: 'Follow-up',
  review_with_report: 'Review with Report',
  custom: 'Custom',
}

const TIMELINE_ICONS: Record<
  Tables<'timeline_events'>['event_type'],
  React.ElementType
> = {
  appointment_created: CalendarDays,
  appointment_completed: CalendarDays,
  clinical_document_created: ClipboardList,
  lab_report_uploaded: TestTubeDiagonal,
  weight_updated: Activity,
  note_added: FileText,
}

// ── Info Row helper ───────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-2 border-b last:border-0">
      <span className="text-xs font-medium text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm">{value ?? '—'}</span>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────

interface PatientProfileTabsProps {
  patient: Tables<'patients'>
  appointments: Tables<'appointments'>[]
  clinicalNotes: Tables<'clinical_notes'>[]
  labReports: Tables<'lab_reports'>[]
  timeline: Tables<'timeline_events'>[]
}

// ── Component ─────────────────────────────────────────────────────────────

export function PatientProfileTabs({
  patient,
  appointments,
  clinicalNotes,
  labReports,
  timeline,
}: PatientProfileTabsProps) {
  const age = calcAge(patient.date_of_birth)

  return (
    <Tabs defaultValue="summary" className="space-y-4">
      <div className="overflow-x-auto">
        <TabsList variant="line" className="w-full sm:w-auto">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="health">Health Info</TabsTrigger>
          <TabsTrigger value="appointments">
            Appointments
            {appointments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {appointments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">
            Clinical Notes
            {clinicalNotes.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {clinicalNotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="labs">
            Lab Reports
            {labReports.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {labReports.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
      </div>

      {/* ── Section 1: Patient Summary ─────────────────────────── */}
      <TabsContent value="summary" className="mt-0">
        <div className="rounded-xl border bg-card p-5 space-y-0.5">
          <InfoRow label="Full Name" value={patient.full_name} />
          <InfoRow label="Patient ID" value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{patient.patient_code}</code>} />
          <InfoRow label="Phone" value={patient.phone} />
          <InfoRow label="Age" value={age !== null ? `${age} years` : null} />
          <InfoRow
            label="Gender"
            value={patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).replace('_', ' ') : null}
          />
          <InfoRow
            label="Height"
            value={patient.height_cm ? `${patient.height_cm} cm` : null}
          />
          <InfoRow
            label="Weight"
            value={patient.weight_kg ? `${patient.weight_kg} kg` : null}
          />
          <InfoRow
            label="Primary Goal"
            value={
              patient.primary_goal ? (
                <Badge variant="secondary" className="font-normal">
                  {GOAL_LABELS[patient.primary_goal] ?? patient.primary_goal}
                </Badge>
              ) : null
            }
          />
          <InfoRow label="Last Visit" value={formatDate(patient.last_visit_at)} />
          <InfoRow label="Patient Since" value={formatDate(patient.created_at)} />
        </div>
      </TabsContent>

      {/* ── Section 2: Health Information ──────────────────────── */}
      <TabsContent value="health" className="mt-0">
        <div className="rounded-xl border bg-card p-5 space-y-0.5">
          <InfoRow
            label="Activity Level"
            value={patient.activity_level ? ACTIVITY_LABELS[patient.activity_level] : null}
          />
          <InfoRow
            label="Sleep Hours"
            value={patient.sleep_hours ? `${patient.sleep_hours} hrs/night` : null}
          />
          <InfoRow
            label="Work Type"
            value={patient.work_type ? WORK_LABELS[patient.work_type] : null}
          />
          <InfoRow
            label="Dietary Type"
            value={patient.dietary_type ? DIETARY_LABELS[patient.dietary_type] : null}
          />
          <InfoRow
            label="Medical Conditions"
            value={
              patient.medical_conditions?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.medical_conditions.map((c) => (
                    <Badge key={c} variant="secondary" className="font-normal text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              ) : null
            }
          />
          <InfoRow
            label="Food Allergies"
            value={
              patient.food_allergies?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.food_allergies.map((a) => (
                    <Badge key={a} variant="secondary" className="font-normal text-xs bg-red-50 text-red-700">
                      {a}
                    </Badge>
                  ))}
                </div>
              ) : null
            }
          />
        </div>
      </TabsContent>

      {/* ── Section 3: Appointment History ─────────────────────── */}
      <TabsContent value="appointments" className="mt-0">
        <div className="rounded-xl border bg-card overflow-hidden">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <CalendarDays className="h-8 w-8 opacity-40" />
              <p className="text-sm">No appointments yet</p>
              <Link
                href={`/appointments/new?patient=${patient.id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 gap-2')}
              >
                <CalendarPlus className="h-4 w-4" />
                Create Appointment
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {appointments.map((appt) => {
                const status = STATUS_CFG[appt.status] ?? STATUS_CFG.upcoming
                return (
                  <div key={appt.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {appt.purpose === 'custom' && appt.custom_purpose
                            ? appt.custom_purpose
                            : PURPOSE_LABELS[appt.purpose]}
                        </p>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                            status.cn
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(appt.appointment_date)} · {formatTime(appt.appointment_time)} ·{' '}
                        {appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Section 4: Clinical Notes ───────────────────────────── */}
      <TabsContent value="notes" className="mt-0">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Clinical Notes</h3>
            <Link
              href={`/clinical-notes/new?patient=${patient.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
            >
              <FileText className="h-4 w-4" />
              Create Document
            </Link>
          </div>
          {clinicalNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-40" />
              <p className="text-sm">No clinical notes yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {clinicalNotes.map((note) => (
                <div key={note.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {note.document_type.replace(/_/g, ' ')} · v{note.version} · {formatDate(note.created_at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-normal capitalize text-xs">
                    {note.document_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Section 5: Lab Reports ──────────────────────────────── */}
      <TabsContent value="labs" className="mt-0">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Lab Reports</h3>
            <Link
              href={`/lab-reports/upload?patient=${patient.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
            >
              <FlaskConical className="h-4 w-4" />
              Upload Report
            </Link>
          </div>
          {labReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <TestTubeDiagonal className="h-8 w-8 opacity-40" />
              <p className="text-sm">No lab reports yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {labReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {report.report_type?.replace(/_/g, ' ') ?? 'Report'} ·{' '}
                      {report.upload_source === 'patient' ? 'Uploaded by patient' : 'Uploaded by dietitian'} ·{' '}
                      {formatDate(report.created_at)}
                    </p>
                  </div>
                  {report.ai_summary && (
                    <Badge variant="secondary" className="text-xs font-normal gap-1">
                      <Activity className="h-3 w-3" />
                      AI Analyzed
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Section 6: Timeline ─────────────────────────────────── */}
      <TabsContent value="timeline" className="mt-0">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground rounded-xl border bg-card">
            <Clock className="h-8 w-8 opacity-40" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0 pl-14">
              {timeline.map((event, idx) => {
                const IconComponent = TIMELINE_ICONS[event.event_type] ?? FileText
                const eventData = (event.event_data ?? {}) as Record<string, unknown>
                const label =
                  event.event_type === 'note_added' && eventData.note
                    ? String(eventData.note)
                    : event.event_type.replace(/_/g, ' ')

                return (
                  <div key={event.id} className="relative pb-6">
                    {/* Icon dot */}
                    <span className="absolute -left-11 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="rounded-lg border bg-card px-4 py-3">
                      <p className="text-sm font-medium capitalize">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
