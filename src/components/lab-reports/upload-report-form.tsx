'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Upload,
  X,
  FileText,
  Loader2,
  Search,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDebounce } from '@/hooks/use-debounce'
import { createClient } from '@/lib/supabase/client'
import { uploadLabReport } from '@/actions/lab-reports'

interface PatientResult {
  id: string
  full_name: string
  patient_code: string
  phone: string
}

export function UploadReportForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')

  const [isPending, startTransition] = useTransition()

  // Patient search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PatientResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [reportType, setReportType] = useState<string>('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  // Pre-select patient from URL
  useEffect(() => {
    if (!preselectedPatientId) return
    const fetchPatient = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, patient_code, phone')
        .eq('id', preselectedPatientId)
        .single()
      if (data) setSelectedPatient(data as PatientResult)
    }
    fetchPatient()
  }, [preselectedPatientId])

  // Patient search
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const search = async () => {
      setSearchLoading(true)
      try {
        const supabase = createClient()
        const term = debouncedSearch.trim()
        const { data } = await supabase
          .from('patients')
          .select('id, full_name, patient_code, phone')
          .or(`full_name.ilike.%${term}%,patient_code.ilike.%${term}%,phone.ilike.%${term}%`)
          .limit(8)
        setSearchResults((data as PatientResult[]) ?? [])
        setSearchOpen(true)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }
    search()
  }, [debouncedSearch])

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient)
    setSearchQuery('')
    setSearchOpen(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const accepted = Array.from(selected).filter(
      (f) =>
        f.type === 'application/pdf' ||
        f.type === 'image/jpeg' ||
        f.type === 'image/png'
    )
    if (accepted.length < selected.length) {
      toast.error('Only PDF, JPG, and PNG files are accepted')
    }
    setFiles((prev) => [...prev, ...accepted])
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a report title')
      return
    }
    if (files.length === 0) {
      toast.error('Please upload at least one file')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Not authenticated')
        setUploading(false)
        return
      }

      // Upload files to Supabase Storage
      const uploadedUrls: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop() ?? 'file'
        const path = `${user.id}/${selectedPatient.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('lab-reports')
          .upload(path, file, { contentType: file.type })
        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`)
          setUploading(false)
          return
        }
        const { data: publicUrl } = supabase.storage
          .from('lab-reports')
          .getPublicUrl(path)
        uploadedUrls.push(publicUrl.publicUrl)
      }

      setUploading(false)

      // Create report record
      startTransition(async () => {
        const result = await uploadLabReport({
          patient_id: selectedPatient.id,
          title: title.trim(),
          report_type: reportType || undefined,
          file_urls: uploadedUrls,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Report uploaded successfully!')
        router.push(`/lab-reports/${result.reportId}`)
      })
    } catch {
      toast.error('Upload failed')
      setUploading(false)
    }
  }

  const isSubmitting = uploading || isPending

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Patient selection */}
      {!selectedPatient ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or patient ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setSearchOpen(true)
                  }}
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchOpen(false)
                    }}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchOpen && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
                  {searchLoading && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
                  )}
                  {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No patients found</div>
                  )}
                  {!searchLoading &&
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                        onClick={() => handleSelectPatient(p)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.patient_code} · {p.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{selectedPatient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-xs">{selectedPatient.patient_code}</code>
                <span className="mx-1.5">·</span>{selectedPatient.phone}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPatient(null)}
              className="shrink-0"
            >
              Change
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Report details */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-title">
                  Report Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="report-title"
                  placeholder="e.g. Complete Blood Count – March 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto-detect by AI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood_test">Blood Test</SelectItem>
                    <SelectItem value="thyroid_panel">Thyroid Panel</SelectItem>
                    <SelectItem value="vitamin_panel">Vitamin Panel</SelectItem>
                    <SelectItem value="lipid_profile">Lipid Profile</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>
                Upload Files <span className="text-destructive">*</span>
              </Label>
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  PDF, JPG, PNG — max 20 MB per file
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" /> Choose Files
                  </span>
                </label>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {selectedPatient && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload Report
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
