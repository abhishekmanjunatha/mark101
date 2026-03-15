'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Loader2,
  Sparkles,
  Heart,
  Lightbulb,
  Eye,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  User,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { createClinicalNote, updateClinicalNote } from '@/actions/clinical-notes'
import type { DocumentType, DocumentBlock } from '@/types/app'
import type { Tables } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────────────────

interface PatientContext {
  id: string
  full_name: string
  patient_code: string
  phone: string
  gender: string | null
  date_of_birth: string | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: string | null
  dietary_type: string | null
  medical_conditions: string[] | null
  food_allergies: string[] | null
  primary_goal: string | null
}

interface DocumentComposerProps {
  /** Existing note for editing (null = create mode) */
  existingNote?: Tables<'clinical_notes'> | null
  /** Pre-loaded patient context (from server component) */
  initialPatient?: PatientContext | null
}

// ── Document type labels ───────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  quick_note: 'Quick Note',
  meal_plan: 'Meal Plan',
  follow_up_recommendation: 'Follow-up Recommendation',
  custom: 'Custom Document',
}

// ── Default blocks per document type ───────────────────────────────────────

function defaultBlocksForType(type: DocumentType): DocumentBlock[] {
  const id = () => crypto.randomUUID()
  switch (type) {
    case 'meal_plan':
      return [
        { id: id(), type: 'title', label: 'Plan Title', content: '', order: 0 },
        { id: id(), type: 'meal_section', label: 'Breakfast', content: '', order: 1 },
        { id: id(), type: 'meal_section', label: 'Mid-Morning Snack', content: '', order: 2 },
        { id: id(), type: 'meal_section', label: 'Lunch', content: '', order: 3 },
        { id: id(), type: 'meal_section', label: 'Evening Snack', content: '', order: 4 },
        { id: id(), type: 'meal_section', label: 'Dinner', content: '', order: 5 },
        { id: id(), type: 'instructions', label: 'Instructions', content: '', order: 6 },
      ]
    case 'follow_up_recommendation':
      return [
        { id: id(), type: 'title', label: 'Document Title', content: '', order: 0 },
        { id: id(), type: 'custom', label: 'Progress Summary', content: '', order: 1 },
        { id: id(), type: 'custom', label: 'Recommendations', content: '', order: 2 },
        { id: id(), type: 'custom', label: 'Next Steps', content: '', order: 3 },
      ]
    case 'quick_note':
      return [
        { id: id(), type: 'title', label: 'Note Title', content: '', order: 0 },
        { id: id(), type: 'custom', label: 'Notes', content: '', order: 1 },
      ]
    case 'custom':
    default:
      return [
        { id: id(), type: 'title', label: 'Document Title', content: '', order: 0 },
        { id: id(), type: 'custom', label: 'Content', content: '', order: 1 },
      ]
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeAge(dob: string | null): string {
  if (!dob) return 'N/A'
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--
  }
  return `${age} yrs`
}

function computeBMI(weight_kg: number | null, height_cm: number | null): string {
  if (!weight_kg || !height_cm || height_cm === 0) return 'N/A'
  const h = height_cm / 100
  return (weight_kg / (h * h)).toFixed(1)
}

function computeIBW(height_cm: number | null, gender: string | null): string {
  if (!height_cm) return 'N/A'
  const heightInches = height_cm / 2.54
  const excess = Math.max(0, heightInches - 60)
  const ibw =
    gender === 'male' ? 50 + 2.3 * excess
    : gender === 'female' ? 45.5 + 2.3 * excess
    : 47.75 + 2.3 * excess
  return ibw.toFixed(1)
}

function computeWeightDiff(
  weight_kg: number | null,
  height_cm: number | null,
  gender: string | null
): string {
  if (!weight_kg || !height_cm) return 'N/A'
  const ibwStr = computeIBW(height_cm, gender)
  if (ibwStr === 'N/A') return 'N/A'
  const diff = weight_kg - parseFloat(ibwStr)
  return (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' kg'
}

interface PatientSnapshotData {
  name: string
  age: string
  gender: string
  height: string
  weight: string
  bmi: string
  ibw: string
  weightDiff: string
  primaryGoal: string
  activityLevel: string
  medicalConditions: string
  foodAllergies: string
}

function buildPatientSnapshotBlock(patient: PatientContext): DocumentBlock {
  const ibwVal = computeIBW(patient.height_cm, patient.gender)
  const snapshot: PatientSnapshotData = {
    name: patient.full_name,
    age: computeAge(patient.date_of_birth),
    gender: patient.gender ?? 'N/A',
    height: patient.height_cm ? `${patient.height_cm} cm` : 'N/A',
    weight: patient.weight_kg ? `${patient.weight_kg} kg` : 'N/A',
    bmi: computeBMI(patient.weight_kg, patient.height_cm),
    ibw: ibwVal !== 'N/A' ? `${ibwVal} kg` : 'N/A',
    weightDiff: computeWeightDiff(patient.weight_kg, patient.height_cm, patient.gender),
    primaryGoal: patient.primary_goal?.replace(/_/g, ' ') ?? 'N/A',
    activityLevel: patient.activity_level?.replace(/_/g, ' ') ?? 'N/A',
    medicalConditions: patient.medical_conditions?.join(', ') || 'None',
    foodAllergies: patient.food_allergies?.join(', ') || 'None',
  }
  return {
    id: 'patient-snapshot',
    type: 'patient_snapshot',
    label: 'Patient Information',
    content: JSON.stringify(snapshot),
    order: -1,
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function DocumentComposer({
  existingNote,
  initialPatient,
}: DocumentComposerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')
  const isEditMode = !!existingNote

  const [isPending, startTransition] = useTransition()

  // Patient
  const [patient, setPatient] = useState<PatientContext | null>(initialPatient ?? null)
  const [patientExpanded, setPatientExpanded] = useState(false)

  // Document state
  const [docType, setDocType] = useState<DocumentType>(
    (existingNote?.document_type as DocumentType) ?? 'meal_plan'
  )
  const [docTitle, setDocTitle] = useState(existingNote?.title ?? '')
  const [blocks, setBlocks] = useState<DocumentBlock[]>(() => {
    if (existingNote?.content) {
      const parsed = existingNote.content as unknown
      if (Array.isArray(parsed)) {
        // Strip patient_snapshot blocks — they are regenerated fresh on every save
        return (parsed as DocumentBlock[]).filter((b) => b.type !== 'patient_snapshot')
      }
    }
    return defaultBlocksForType(
      (existingNote?.document_type as DocumentType) ?? 'meal_plan'
    )
  })

  // AI state
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null)
  // Staged AI result — shown in preview only until the user explicitly applies it
  const [aiEnhancedBlocks, setAiEnhancedBlocks] = useState<DocumentBlock[] | null>(null)
  const [aiRawResult, setAiRawResult] = useState<string | null>(null)

  // Preview — open by default
  const [showPreview, setShowPreview] = useState(true)

  // ── Fetch patient if pre-selected by URL or from existing note ──────
  useEffect(() => {
    if (patient) return
    const pid = preselectedPatientId ?? existingNote?.patient_id
    if (!pid) return
    const fetchPatient = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select(
          'id, full_name, patient_code, phone, gender, date_of_birth, height_cm, weight_kg, activity_level, dietary_type, medical_conditions, food_allergies, primary_goal'
        )
        .eq('id', pid)
        .single()
      if (data) setPatient(data as PatientContext)
    }
    fetchPatient()
  }, [preselectedPatientId, existingNote?.patient_id, patient])

  // ── Block management ────────────────────────────────────────────────
  const updateBlockContent = useCallback(
    (blockId: string, content: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, content } : b))
      )
    },
    []
  )

  const updateBlockLabel = useCallback(
    (blockId: string, label: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, label } : b))
      )
    },
    []
  )

  const addBlock = useCallback(() => {
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'custom',
        label: 'New Section',
        content: '',
        order: prev.length,
      },
    ])
  }, [])

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev
        .filter((b) => b.id !== blockId)
        .map((b, i) => ({ ...b, order: i }))
    )
  }, [])

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
      return copy.map((b, i) => ({ ...b, order: i }))
    })
  }, [])

  // ── Document type change ────────────────────────────────────────────
  const handleDocTypeChange = (type: DocumentType) => {
    setDocType(type)
    // Only reset blocks if all content is empty (fresh start)
    const hasContent = blocks.some((b) => b.content.trim())
    if (!hasContent) {
      setBlocks(defaultBlocksForType(type))
      setAiEnhancedBlocks(null)
      setAiRawResult(null)
    }
  }

  // ── AI Actions ──────────────────────────────────────────────────────
  const callAI = async (action: 'enhance' | 'patient_friendly' | 'suggest') => {
    const contentText = blocks
      .map((b) => `## ${b.label}\n${b.content}`)
      .join('\n\n')

    if (!contentText.trim() && action !== 'suggest') {
      toast.error('Add some content first before using AI.')
      return
    }

    setAiLoading(action)
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
    try {
      const res = await fetch('/api/ai/enhance-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content: contentText,
          patientContext: patient
            ? {
                age: computeAge(patient.date_of_birth),
                gender: patient.gender,
                height_cm: patient.height_cm,
                weight_kg: patient.weight_kg,
                primary_goal: patient.primary_goal,
                activity_level: patient.activity_level,
                dietary_type: patient.dietary_type,
                medical_conditions: patient.medical_conditions?.join(', ') ?? 'None',
                food_allergies: patient.food_allergies?.join(', ') ?? 'None',
              }
            : undefined,
        }),
      })

      const data = (await res.json()) as { result?: string; error?: string }
      if (!res.ok || data.error) {
        toast.error(data.error ?? 'AI request failed')
        return
      }

      if (action === 'suggest') {
        setAiSuggestions(data.result ?? null)
      } else {
        const aiResult = data.result ?? ''
        const rawSections = aiResult.split(/^##\s+/m).filter(Boolean)

        // Safety: AI returned unstructured text — show raw output only, never touch blocks
        if (rawSections.length === 0) {
          setAiRawResult(aiResult)
          setAiEnhancedBlocks(null)
          setShowPreview(true)
          toast.success('AI output ready — review in preview below')
          return
        }

        // Build label→content map for label-based matching
        const sectionMap: Record<string, string> = {}
        for (const raw of rawSections) {
          const newlineIdx = raw.indexOf('\n')
          if (newlineIdx === -1) {
            sectionMap[raw.trim().toLowerCase()] = ''
          } else {
            const heading = raw.slice(0, newlineIdx).trim().toLowerCase()
            const content = raw.slice(newlineIdx + 1).trim()
            sectionMap[heading] = content
          }
        }

        const hasLabelMatches = blocks.some(
          (b) => b.type !== 'title' && b.label.toLowerCase() in sectionMap
        )

        const enhanced = hasLabelMatches
          ? blocks.map((b) => {
              if (b.type === 'title') return b
              const key = b.label.toLowerCase()
              return key in sectionMap ? { ...b, content: sectionMap[key] } : b
            })
          : (() => {
              // Positional fallback: map by index order
              const updated = [...blocks]
              let sectionIdx = 0
              for (let i = 0; i < updated.length; i++) {
                if (updated[i].type === 'title') continue
                if (sectionIdx < rawSections.length) {
                  const raw = rawSections[sectionIdx]
                  const newlineIdx = raw.indexOf('\n')
                  const content = newlineIdx !== -1 ? raw.slice(newlineIdx + 1).trim() : raw.trim()
                  updated[i] = { ...updated[i], content }
                  sectionIdx++
                }
              }
              return updated
            })()

        // Stage in preview — original editor blocks remain unchanged
        setAiEnhancedBlocks(enhanced)
        setShowPreview(true)
        toast.success('AI enhancement ready — review in preview, then apply')
      }
    } catch {
      toast.error('Failed to connect to AI service')
    } finally {
      setAiLoading(null)
    }
  }

  // ── Apply / Discard AI enhanced result ──────────────────────────────
  const handleApplyAIChanges = useCallback(() => {
    if (!aiEnhancedBlocks) return
    setBlocks(aiEnhancedBlocks)
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
    toast.success('AI changes applied to editor')
  }, [aiEnhancedBlocks])

  const handleDiscardAIChanges = useCallback(() => {
    setAiEnhancedBlocks(null)
    setAiRawResult(null)
    toast('AI changes discarded')
  }, [])

  // ── Save ────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!patient) {
      toast.error('No patient selected')
      return
    }
    if (!docTitle.trim()) {
      toast.error('Please enter a document title')
      return
    }
    // Update title block and prepend a patient snapshot for historical accuracy
    const contentBlocks = blocks.map((b) =>
      b.type === 'title' ? { ...b, content: docTitle } : b
    )
    const snapshotBlock = buildPatientSnapshotBlock(patient)
    const finalBlocks = [snapshotBlock, ...contentBlocks]

    startTransition(async () => {
      const input = {
        patient_id: patient.id,
        document_type: docType,
        title: docTitle.trim(),
        blocks: finalBlocks,
      }

      const result = isEditMode
        ? await updateClinicalNote(existingNote!.id, input)
        : await createClinicalNote(input)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEditMode ? 'Document updated' : 'Document saved')
      router.push('/clinical-notes')
      router.refresh()
    })
  }

  // ── Compose content for preview ─────────────────────────────────────
  // When AI has a staged result, the preview shows it; the editor blocks are untouched
  const previewBlocks = aiEnhancedBlocks ?? blocks
  const previewContent = previewBlocks
    .filter((b) => b.type !== 'title' && b.type !== 'patient_snapshot')
    .map(
      (b) =>
        `<h3 class="font-semibold text-sm mt-4 mb-1">${b.label}</h3><p class="text-sm whitespace-pre-wrap">${b.content || '<span class="text-muted-foreground italic">Empty</span>'}</p>`
    )
    .join('')

  // Patient snapshot for preview header — always computed fresh from live patient state
  const liveSnapshotData: PatientSnapshotData | null = patient
    ? (JSON.parse(buildPatientSnapshotBlock(patient).content) as PatientSnapshotData)
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ══════════════ Section 1: Document Type ══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={docType}
                onValueChange={(v) => handleDocTypeChange(v as DocumentType)}
              >
                <SelectTrigger className="w-full">
                  <span className="text-sm">{DOC_TYPE_LABELS[docType] ?? docType}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick_note">Quick Note</SelectItem>
                  <SelectItem value="meal_plan">Meal Plan</SelectItem>
                  <SelectItem value="follow_up_recommendation">Follow-up Recommendation</SelectItem>
                  <SelectItem value="custom">Custom Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doc-title"
                placeholder="e.g. Weight Loss Meal Plan – Week 1"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════ Section 2: Patient Context ══════════════ */}
      {patient && (
        <Card>
          <CardContent className="py-4">
            <button
              type="button"
              className="flex w-full items-center gap-3 text-left"
              onClick={() => setPatientExpanded((v) => !v)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{patient.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.patient_code} · {patient.phone}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs mr-2">
                Patient Context
              </Badge>
              {patientExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {patientExpanded && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t">
                {[
                  { label: 'Age', value: computeAge(patient.date_of_birth) },
                  { label: 'Gender', value: patient.gender ?? 'N/A' },
                  {
                    label: 'Height',
                    value: patient.height_cm ? `${patient.height_cm} cm` : 'N/A',
                  },
                  {
                    label: 'Weight',
                    value: patient.weight_kg ? `${patient.weight_kg} kg` : 'N/A',
                  },
                  { label: 'Primary Goal', value: patient.primary_goal ?? 'N/A' },
                  {
                    label: 'Activity Level',
                    value: patient.activity_level?.replace(/_/g, ' ') ?? 'N/A',
                  },
                  { label: 'Dietary Type', value: patient.dietary_type ?? 'N/A' },
                  {
                    label: 'Medical Conditions',
                    value: patient.medical_conditions?.join(', ') || 'None',
                  },
                  {
                    label: 'Food Allergies',
                    value: patient.food_allergies?.join(', ') || 'None',
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════ Section 3: Structured Document Editor ══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Document Content</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addBlock}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocks.map((block, idx) => (
            <div
              key={block.id}
              className="group rounded-lg border bg-background p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <Input
                  value={block.label}
                  onChange={(e) => updateBlockLabel(block.id, e.target.value)}
                  className="h-8 text-sm font-medium border-0 bg-transparent px-1 focus-visible:ring-1"
                  placeholder="Section name"
                />
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={idx === 0}
                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={idx === blocks.length - 1}
                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded p-1 hover:bg-destructive/10 text-destructive"
                      title="Remove section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Textarea
                value={block.content}
                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                placeholder={
                  block.type === 'title'
                    ? 'Enter document title…'
                    : block.type === 'instructions'
                      ? 'e.g. Drink 3L water daily, avoid refined sugar…'
                      : `Enter ${block.label.toLowerCase()} details…`
                }
                rows={block.type === 'title' ? 1 : 4}
                className="resize-none"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ══════════════ Section 4: AI Assistance ══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI Assistance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={aiLoading !== null}
              onClick={() => callAI('enhance')}
            >
              {aiLoading === 'enhance' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              )}
              Enhance with AI
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={aiLoading !== null}
              onClick={() => callAI('patient_friendly')}
            >
              {aiLoading === 'patient_friendly' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Heart className="h-3.5 w-3.5 text-pink-500" />
              )}
              Format for Patient
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={aiLoading !== null}
              onClick={() => callAI('suggest')}
            >
              {aiLoading === 'suggest' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              )}
              AI Suggestions
            </Button>
          </div>

          {aiSuggestions && (
            <div className="rounded-lg border bg-amber-50 p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-amber-800 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4" />
                  AI Suggestions
                </p>
                <button
                  type="button"
                  onClick={() => setAiSuggestions(null)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="whitespace-pre-wrap text-amber-900">{aiSuggestions}</div>
            </div>
          )}

          {/* AI enhancement pending — Apply or Discard */}
          {(aiEnhancedBlocks || aiRawResult) && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-medium text-violet-800">AI enhancement ready</p>
              </div>
              <p className="text-xs text-violet-700">
                Your original content is unchanged. Review the preview below, then decide.
              </p>
              <div className="flex items-center gap-2">
                {aiEnhancedBlocks && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyAIChanges}
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Apply AI Changes
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardAIChanges}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Discard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════ Section 5: Document Preview ══════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowPreview((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Document Preview
            </CardTitle>
            {showPreview ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div className="rounded-lg border bg-white p-6 space-y-4">
              {/* AI indicator banner */}
              {(aiEnhancedBlocks || aiRawResult) && (
                <div className="flex items-center gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="text-xs font-medium text-violet-700">
                    {aiRawResult
                      ? 'AI output (unstructured) — editor unchanged'
                      : 'AI Enhanced Preview — your editor content is unchanged'}
                  </span>
                </div>
              )}

              {/* Document title */}
              <h2 className="text-xl font-bold leading-tight">
                {docTitle || <span className="text-muted-foreground italic font-normal text-base">Untitled Document</span>}
              </h2>

              {/* Patient snapshot header */}
              {liveSnapshotData && (
                <div className="rounded-md border bg-slate-50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                    {[
                      { label: 'Name', value: liveSnapshotData.name },
                      { label: 'Age', value: liveSnapshotData.age },
                      { label: 'Gender', value: liveSnapshotData.gender },
                      { label: 'Height', value: liveSnapshotData.height },
                      { label: 'Current Weight', value: liveSnapshotData.weight },
                      { label: 'BMI', value: liveSnapshotData.bmi },
                      { label: 'Ideal Body Weight', value: liveSnapshotData.ibw },
                      { label: 'Weight Difference', value: liveSnapshotData.weightDiff },
                      { label: 'Primary Goal', value: liveSnapshotData.primaryGoal },
                      { label: 'Activity Level', value: liveSnapshotData.activityLevel },
                      { label: 'Medical Conditions', value: liveSnapshotData.medicalConditions },
                      { label: 'Food Allergies', value: liveSnapshotData.foodAllergies },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-xs font-medium capitalize">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unstructured AI output (raw fallback) */}
              {aiRawResult && (
                <div className="rounded-md border bg-violet-50 p-4 text-sm text-violet-900 whitespace-pre-wrap">
                  {aiRawResult}
                </div>
              )}

              {/* Document sections */}
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ══════════════ Actions ══════════════ */}
      <div className="flex items-center gap-3 pb-8">
        <Button
          type="button"
          disabled={isPending || !patient}
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditMode ? 'Update Document' : 'Save Document'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
