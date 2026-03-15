import type { Metadata } from 'next'
import { PatientUploadForm } from './patient-upload-form'

export const metadata: Metadata = { title: 'Upload Lab Report' }

// Public page — patients use this link to upload lab reports
// No authentication required; access controlled by secure token
export default async function LabUploadPage(props: {
  params: Promise<{ token: string }>
}) {
  const { token } = await props.params
  return <PatientUploadForm token={token} />
}
