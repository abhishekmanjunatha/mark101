import type { Metadata } from 'next'
import { getClinicalNotes } from '@/actions/clinical-notes'
import { ClinicalNotesList } from '@/components/clinical-notes/clinical-notes-list'

export const metadata: Metadata = { title: 'Clinical Notes' }

export default async function ClinicalNotesPage(props: {
  searchParams: Promise<{ patient?: string }>
}) {
  const searchParams = await props.searchParams
  const patientId = searchParams.patient
  const notes = await getClinicalNotes(patientId)

  return <ClinicalNotesList notes={notes} patientId={patientId} />
}
