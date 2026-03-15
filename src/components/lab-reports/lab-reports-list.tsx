'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FlaskConical,
  Plus,
  Link2,
  Trash2,
  MoreHorizontal,
  Clock,
  FileText,
  Activity,
  Upload,
  User,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { deleteLabReport, generateSecureUploadToken } from '@/actions/lab-reports'
import type { Tables } from '@/types/database'

interface LabReportsListProps {
  reports: (Tables<'lab_reports'> & {
    patient?: { id: string; full_name: string; patient_code: string }
  })[]
  patientId?: string
  patientName?: string
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  blood_test: 'Blood Test',
  thyroid_panel: 'Thyroid Panel',
  vitamin_panel: 'Vitamin Panel',
  lipid_profile: 'Lipid Profile',
  other: 'Other',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function LabReportsList({ reports, patientId, patientName }: LabReportsListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tokenLink, setTokenLink] = useState<string | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDelete = (reportId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteLabReport(reportId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Report deleted')
        router.refresh()
      }
    })
  }

  const handleGenerateLink = () => {
    if (!patientId) {
      toast.error('No patient selected for secure link')
      return
    }
    startTransition(async () => {
      const result = await generateSecureUploadToken(patientId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const link = `${window.location.origin}/lab-upload/${result.token}`
      setTokenLink(link)
      setTokenDialogOpen(true)
    })
  }

  const handleCopyLink = async () => {
    if (!tokenLink) return
    await navigator.clipboard.writeText(tokenLink)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareWhatsApp = () => {
    if (!tokenLink) return
    const text = encodeURIComponent(
      `Please upload your lab report using this secure link:\n${tokenLink}\n\nThis link expires in 48 hours.`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const uploadHref = patientId
    ? `/lab-reports/upload?patient=${patientId}`
    : '/lab-reports/upload'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lab Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload, analyze, and manage lab reports for your patients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {patientId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleGenerateLink}
              disabled={isPending}
            >
              <Link2 className="h-4 w-4" />
              Request Report
            </Button>
          )}
          <Link
            href={uploadHref}
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
            )}
          >
            <Upload className="h-4 w-4" />
            Upload Report
          </Link>
        </div>
      </div>

      {/* Secure link dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Upload Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this secure link with {patientName ?? 'the patient'} to upload their lab report. The link expires in 48 hours.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={tokenLink ?? ''}
                className="flex-1 h-9 rounded-md border bg-muted px-3 text-sm font-mono truncate"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleShareWhatsApp}>
                <ExternalLink className="h-3.5 w-3.5" />
                Share via WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 gap-3 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <FlaskConical className="h-7 w-7 opacity-40" />
          </div>
          <p className="text-sm font-medium">No lab reports yet</p>
          <p className="text-xs">Upload a report or request one from the patient.</p>
          <Link
            href={uploadHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2 gap-2')}
          >
            <Upload className="h-4 w-4" />
            Upload Report
          </Link>
        </div>
      )}

      {/* Reports list */}
      {reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => router.push(`/lab-reports/${report.id}`)}
            >
              {/* Icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <FileText className="h-5 w-5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{report.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {report.report_type && (
                    <Badge variant="secondary" className="text-xs font-normal capitalize">
                      {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {report.upload_source === 'patient' ? (
                      <>
                        <User className="h-3 w-3" /> Patient
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" /> Dietitian
                      </>
                    )}
                  </span>
                  {report.patient && !patientId && (
                    <span className="text-xs text-muted-foreground">
                      · {report.patient.full_name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(report.created_at)}
                  </span>
                </div>
              </div>

              {/* AI badge */}
              {report.ai_summary && (
                <Badge variant="secondary" className="text-xs font-normal gap-1 shrink-0">
                  <Activity className="h-3 w-3" />
                  AI Analyzed
                </Badge>
              )}

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 hover:bg-muted shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/lab-reports/${report.id}`)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Report
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(report.id, report.title)
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
