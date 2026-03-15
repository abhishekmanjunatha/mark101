import type { Metadata } from 'next'
import { UploadReportForm } from '@/components/lab-reports/upload-report-form'

export const metadata: Metadata = { title: 'Upload Lab Report' }

export default function UploadLabReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Lab Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a lab report and optionally run AI analysis.
        </p>
      </div>
      <UploadReportForm />
    </div>
  )
}
