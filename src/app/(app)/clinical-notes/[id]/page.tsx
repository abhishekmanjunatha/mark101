import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getClinicalNote } from '@/actions/clinical-notes'
import { DocumentComposer } from '@/components/clinical-notes/document-composer'

export const metadata: Metadata = { title: 'View Clinical Document' }

export default async function ClinicalNoteDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const note = await getClinicalNote(id)

  if (!note) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Document</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your clinical document and save changes.
        </p>
      </div>
      <DocumentComposer existingNote={note} />
    </div>
  )
}
