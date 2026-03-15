import type { Metadata } from 'next'
import { getLabReports } from '@/actions/lab-reports'
import { LabReportsList } from '@/components/lab-reports/lab-reports-list'

export const metadata: Metadata = { title: 'Lab Reports' }

export default async function LabReportsPage(props: {
  searchParams: Promise<{ patient?: string }>
}) {
  const searchParams = await props.searchParams
  const patientId = searchParams.patient
  const reports = await getLabReports(patientId)

  // Get patient name from first report if filtered
  const patientName = patientId && reports.length > 0
    ? reports[0].patient?.full_name
    : undefined

  return (
    <LabReportsList
      reports={reports}
      patientId={patientId}
      patientName={patientName}
    />
  )
}
