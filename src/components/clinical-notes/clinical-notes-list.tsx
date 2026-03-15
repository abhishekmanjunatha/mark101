'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Trash2,
  MoreHorizontal,
  Clock,
  UtensilsCrossed,
  ClipboardList,
  NotebookPen,
} from 'lucide-react'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { deleteClinicalNote } from '@/actions/clinical-notes'
import type { Tables } from '@/types/database'

interface ClinicalNotesListProps {
  notes: Tables<'clinical_notes'>[]
  patientId?: string
}

const DOC_TYPE_META: Record<
  string,
  { label: string; icon: typeof FileText; color: string }
> = {
  quick_note: {
    label: 'Quick Note',
    icon: NotebookPen,
    color: 'text-blue-600 bg-blue-50',
  },
  meal_plan: {
    label: 'Meal Plan',
    icon: UtensilsCrossed,
    color: 'text-emerald-600 bg-emerald-50',
  },
  follow_up_recommendation: {
    label: 'Follow-up',
    icon: ClipboardList,
    color: 'text-violet-600 bg-violet-50',
  },
  custom: {
    label: 'Custom',
    icon: FileText,
    color: 'text-amber-600 bg-amber-50',
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ClinicalNotesList({ notes, patientId }: ClinicalNotesListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = (noteId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteClinicalNote(noteId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Note deleted')
        router.refresh()
      }
    })
  }

  const createHref = patientId
    ? `/clinical-notes/new?patient=${patientId}`
    : '/clinical-notes/new'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage clinical documents for your patients.
          </p>
        </div>
        <Link
          href={createHref}
          className={cn(buttonVariants({ size: 'sm' }), 'bg-emerald-600 hover:bg-emerald-700 text-white gap-2')}
        >
          <Plus className="h-4 w-4" />
          New Document
        </Link>
      </div>

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 gap-3 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-7 w-7 opacity-40" />
          </div>
          <p className="text-sm font-medium">No clinical notes yet</p>
          <p className="text-xs">Create your first document to get started.</p>
          <Link
            href={createHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2 gap-2')}
          >
            <Plus className="h-4 w-4" />
            Create Document
          </Link>
        </div>
      )}

      {/* Notes grid */}
      {notes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const meta = DOC_TYPE_META[note.document_type] ?? DOC_TYPE_META.custom
            const Icon = meta.icon

            return (
              <div
                key={note.id}
                className="group relative rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => router.push(`/clinical-notes/${note.id}`)}
              >
                {/* Type badge + actions */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      meta.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/clinical-notes/${note.id}`)
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View / Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(note.id, note.title)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold line-clamp-2">{note.title}</h3>

                {/* Meta */}
                <div className="flex items-center gap-2 mt-2.5">
                  <Badge variant="secondary" className="text-xs font-normal capitalize">
                    {meta.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">v{note.version}</span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(note.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
