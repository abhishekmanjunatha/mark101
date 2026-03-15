import type { AIMessage, AIRequestOptions, AIResponse } from '@/types/ai'

export async function openrouterProvider(
  messages: AIMessage[],
  options: AIRequestOptions & { model: string }
): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'

  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'peepal',
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    provider: 'openrouter',
    model: options.model,
  }
}
