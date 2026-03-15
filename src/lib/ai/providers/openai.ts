import type { AIMessage, AIRequestOptions, AIResponse } from '@/types/ai'

export async function openaiProvider(
  messages: AIMessage[],
  options: AIRequestOptions & { model: string }
): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
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
    throw new Error(`OpenAI error ${response.status}: ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    model: options.model,
  }
}
