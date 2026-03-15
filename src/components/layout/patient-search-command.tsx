'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, User, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

interface PatientResult {
  id: string
  full_name: string
  patient_code: string
  phone: string | null
}

interface PatientSearchCommandProps {
  className?: string
}

export function PatientSearchCommand({ className }: PatientSearchCommandProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PatientResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const term = debouncedQuery.trim()

        const { data } = await supabase
          .from('patients')
          .select('id, full_name, patient_code, phone')
          .or(
            `full_name.ilike.%${term}%,patient_code.ilike.%${term}%,phone.ilike.%${term}%`
          )
          .limit(8)

        setResults((data as PatientResult[]) ?? [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    search()
  }, [debouncedQuery])

  const handleSelect = (patientId: string) => {
    setQuery('')
    setOpen(false)
    setResults([])
    router.push(`/patients/${patientId}`)
  }

  const handleClear = () => {
    setQuery('')
    setOpen(false)
    setResults([])
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search patients by name, ID, or phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-muted-foreground"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No patients found for &ldquo;{query}&rdquo;
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul>
              {results.map((patient, idx) => (
                <li key={patient.id}>
                  <button
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                      idx === 0 && 'rounded-t-lg',
                      idx === results.length - 1 && 'rounded-b-lg'
                    )}
                    onClick={() => handleSelect(patient.id)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.patient_code}
                        {patient.phone && <span> · {patient.phone}</span>}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
