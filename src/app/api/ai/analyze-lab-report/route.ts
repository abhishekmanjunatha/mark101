import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'

interface AnalyzeRequestBody {
  reportId: string
  fileUrls: string[]
  reportType?: string
  patientContext?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured. Set OPENROUTER_API_KEY in .env.local.' },
      { status: 503 }
    )
  }

  let body: AnalyzeRequestBody
  try {
    body = (await request.json()) as AnalyzeRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { reportId, fileUrls, reportType, patientContext } = body

  if (!reportId || !fileUrls?.length) {
    return NextResponse.json(
      { error: 'Missing required fields: reportId, fileUrls' },
      { status: 400 }
    )
  }

  const contextBlock = patientContext
    ? `\n\nPatient Context:\n- Age: ${patientContext.age ?? 'N/A'}\n- Gender: ${patientContext.gender ?? 'N/A'}\n- Primary Goal: ${patientContext.primary_goal ?? 'N/A'}\n- Medical Conditions: ${patientContext.medical_conditions ?? 'None'}\n- Food Allergies: ${patientContext.food_allergies ?? 'None'}`
    : ''

  const systemPrompt = `You are a clinical nutrition AI assistant helping a registered dietitian analyze lab reports. The report type is: ${reportType ?? 'general lab report'}.${contextBlock}

Analyze the lab report and return a JSON object with exactly these fields:
{
  "summary": "A 2-3 sentence readable summary of the key findings",
  "metrics": [
    { "name": "Metric Name", "value": "value with unit", "status": "normal|low|high|critical", "reference": "reference range" }
  ],
  "observations": [
    { "type": "concern|improvement|note", "text": "Brief observation about the finding" }
  ]
}

IMPORTANT: 
- Mark as "AI observation – not a medical diagnosis"
- Flag abnormal values clearly
- Be specific about which values need attention for dietary intervention
- Return ONLY valid JSON, no markdown or explanation`

  try {
    // Build messages — include file URLs as image_url for vision models
    const userContent: { type: string; text?: string; image_url?: { url: string } }[] = [
      {
        type: 'text',
        text: `Analyze this ${reportType?.replace(/_/g, ' ') ?? 'lab'} report. Extract all metrics and provide observations.`,
      },
    ]

    for (const url of fileUrls) {
      userContent.push({
        type: 'image_url',
        image_url: { url },
      })
    }

    const aiResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://peepal.app',
        'X-Title': 'Peepal Lab Analysis',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('AI API error:', errText)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      )
    }

    const aiData = (await aiResponse.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const rawResult = aiData.choices?.[0]?.message?.content ?? ''

    // Parse JSON from AI response (strip markdown fences if present)
    const jsonStr = rawResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: { summary?: string; metrics?: unknown[]; observations?: unknown[] }
    try {
      parsed = JSON.parse(jsonStr) as { summary?: string; metrics?: unknown[]; observations?: unknown[] }
    } catch {
      return NextResponse.json({
        summary: rawResult,
        metrics: [],
        observations: [],
      })
    }

    return NextResponse.json({
      summary: parsed.summary ?? '',
      metrics: parsed.metrics ?? [],
      observations: parsed.observations ?? [],
    })
  } catch (err) {
    console.error('AI request failed:', err)
    return NextResponse.json(
      { error: 'AI request failed' },
      { status: 500 }
    )
  }
}
