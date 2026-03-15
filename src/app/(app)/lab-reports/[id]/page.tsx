import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLabReport } from '@/actions/lab-reports'
import { LabReportDetail } from '@/components/lab-reports/lab-report-detail'

export const metadata: Metadata = { title: 'Lab Report' }

export default async function LabReportDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const report = await getLabReport(id)

  if (!report) {
    notFound()
  }

  return <LabReportDetail report={report} />
}
