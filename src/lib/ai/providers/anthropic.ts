import type { AIMessage, AIRequestOptions, AIResponse } from '@/types/ai'

export async function anthropicProvider(
  messages: AIMessage[],
  options: AIRequestOptions & { model: string }
): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  // Anthropic separates system message from conversation messages
  const systemMessage = messages.find((m) => m.role === 'system')?.content ?? ''
  const conversationMessages = messages.filter((m) => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      system: systemMessage,
      messages: conversationMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic error ${response.status}: ${error}`)
  }

  const data = await response.json()
  return {
    content: data.content[0].text,
    provider: 'anthropic',
    model: options.model,
  }
}
