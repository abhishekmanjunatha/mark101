import type { AIMessage, AIRequestOptions, AIResponse } from '@/types/ai'

export async function geminiProvider(
  messages: AIMessage[],
  options: AIRequestOptions & { model: string }
): Promise<AIResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  // Convert to Gemini's content format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const systemInstruction = messages.find((m) => m.role === 'system')?.content

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(systemInstruction && {
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini error ${response.status}: ${error}`)
  }

  const data = await response.json()
  return {
    content: data.candidates[0].content.parts[0].text,
    provider: 'gemini',
    model: options.model,
  }
}
