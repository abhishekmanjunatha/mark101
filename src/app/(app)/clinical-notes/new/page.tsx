import type { Metadata } from 'next'
import { DocumentComposer } from '@/components/clinical-notes/document-composer'

export const metadata: Metadata = { title: 'Create Clinical Document' }

export default function NewClinicalNotePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Clinical Document</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a structured clinical document with AI assistance.
        </p>
      </div>
      <DocumentComposer />
    </div>
  )
}
