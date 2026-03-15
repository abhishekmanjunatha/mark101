import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'

type EnhanceAction = 'enhance' | 'patient_friendly' | 'suggest'

interface EnhanceRequestBody {
  action: EnhanceAction
  content: string
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

  let body: EnhanceRequestBody
  try {
    body = (await request.json()) as EnhanceRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, content, patientContext } = body

  if (!action || !content) {
    return NextResponse.json(
      { error: 'Missing required fields: action, content' },
      { status: 400 }
    )
  }

  const contextBlock = patientContext
    ? `\n\nPatient Context:\n- Age: ${patientContext.age ?? 'N/A'}\n- Gender: ${patientContext.gender ?? 'N/A'}\n- Height: ${patientContext.height_cm ?? 'N/A'} cm\n- Weight: ${patientContext.weight_kg ?? 'N/A'} kg\n- Primary Goal: ${patientContext.primary_goal ?? 'N/A'}\n- Activity Level: ${patientContext.activity_level ?? 'N/A'}\n- Dietary Type: ${patientContext.dietary_type ?? 'N/A'}\n- Medical Conditions: ${patientContext.medical_conditions ?? 'None'}\n- Food Allergies: ${patientContext.food_allergies ?? 'None'}`
    : ''

  const systemPrompts: Record<EnhanceAction, string> = {
    enhance: `You are a clinical nutrition assistant improving a structured clinical document. The document has sections marked with ## headings (e.g. ## Breakfast, ## Lunch). You MUST follow these rules exactly:
1. Return the document using the EXACT SAME ## headings in the same order (e.g. ## Breakfast, ## Mid-Morning Snack, ## Lunch, ## Dinner, ## Instructions)
2. Improve the content within each section for clarity, specificity, and professionalism
3. Do NOT add new sections, introductions, summaries, or preambles
4. Do NOT include patient background information inside the output — use it only to tailor the content
5. Start your response directly with the first ## heading — no introductory text${contextBlock}`,
    patient_friendly: `You are a nutrition communication specialist rewriting a structured clinical document for patients. The document has sections marked with ## headings. You MUST follow these rules exactly:
1. Return the document using the EXACT SAME ## headings in the same order
2. Rewrite content within each section in simple, warm, conversational language — no medical jargon
3. Do NOT add introductions, conclusions, or patient background information in the output
4. Do NOT add new sections — only rewrite existing ones
5. Start your response directly with the first ## heading — no introductory text${contextBlock}`,
    suggest: `You are a dietitian's AI assistant. Based on the patient context and the document content below, provide 3-5 brief, actionable health suggestions or alerts. Format each as a bullet point starting with an emoji. Be specific to the patient's conditions and goals. Return only the suggestions.${contextBlock}`,
  }

  const systemPrompt = systemPrompts[action]
  if (!systemPrompt) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  try {
    const aiResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://peepal.app',
        'X-Title': 'Peepal Clinical Notes',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        max_tokens: 2048,
        temperature: 0.4,
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
    const result = aiData.choices?.[0]?.message?.content ?? ''

    return NextResponse.json({ result })
  } catch (err) {
    console.error('AI request failed:', err)
    return NextResponse.json(
      { error: 'AI request failed' },
      { status: 500 }
    )
  }
}
