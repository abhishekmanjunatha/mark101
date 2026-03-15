import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Validates a secure upload token and returns the associated report info
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('lab_reports')
    .select('id, patient_id, dietitian_id, token_expires_at, file_urls, patients!inner(full_name)')
    .eq('upload_token', token)
    .single()

  if (!data) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 })
  }

  const row = data as { id: string; token_expires_at: string | null; file_urls: string[]; patients: { full_name: string } }

  // Check expiry
  if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This upload link has expired' }, { status: 410 })
  }

  // Check if already uploaded
  if (row.file_urls && row.file_urls.length > 0) {
    return NextResponse.json({ error: 'Report already uploaded via this link' }, { status: 409 })
  }

  return NextResponse.json({
    reportId: row.id,
    patientName: row.patients.full_name,
  })
}

// Patient uploads files via this token
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  let body: { file_urls: string[]; title?: string }
  try {
    body = (await request.json()) as { file_urls: string[]; title?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.file_urls?.length) {
    return NextResponse.json({ error: 'At least one file URL is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Find the report by token
  const { data: report } = await supabase
    .from('lab_reports')
    .select('id, dietitian_id, patient_id, token_expires_at, file_urls')
    .eq('upload_token', token)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 })
  }

  const row = report as { id: string; dietitian_id: string; patient_id: string; token_expires_at: string | null; file_urls: string[] }

  if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This upload link has expired' }, { status: 410 })
  }

  if (row.file_urls && row.file_urls.length > 0) {
    return NextResponse.json({ error: 'Report already uploaded' }, { status: 409 })
  }

  // Update report with uploaded files
  const { error } = await supabase
    .from('lab_reports')
    .update({
      file_urls: body.file_urls,
      title: body.title || 'Patient Upload',
      upload_token: null, // Consume the token
    })
    .eq('id', row.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Timeline event
  await supabase.from('timeline_events').insert({
    dietitian_id: row.dietitian_id,
    patient_id: row.patient_id,
    event_type: 'lab_report_uploaded' as const,
    event_data: { source: 'patient', title: body.title || 'Patient Upload' },
    reference_id: row.id,
  })

  return NextResponse.json({ success: true })
}
