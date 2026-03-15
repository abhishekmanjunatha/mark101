import type { AIMessage, AIRequestOptions, AIResponse } from '@/types/ai'
import { openrouterProvider } from './providers/openrouter'
import { openaiProvider } from './providers/openai'
import { anthropicProvider } from './providers/anthropic'
import { geminiProvider } from './providers/gemini'

// Default model per provider
const DEFAULT_MODELS = {
  openrouter: 'google/gemini-2.0-flash-001',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-2.0-flash',
} as const

// Provider fallback chain: OpenRouter → OpenAI → Anthropic → Gemini
const FALLBACK_CHAIN = ['openrouter', 'openai', 'anthropic', 'gemini'] as const

export async function chat(
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<AIResponse> {
  const providers =
    options.provider
      ? [options.provider, ...FALLBACK_CHAIN.filter((p) => p !== options.provider)]
      : FALLBACK_CHAIN

  let lastError: Error | null = null

  for (const provider of providers) {
    const model = options.model ?? DEFAULT_MODELS[provider]
    try {
      switch (provider) {
        case 'openrouter':
          return await openrouterProvider(messages, { ...options, model })
        case 'openai':
          return await openaiProvider(messages, { ...options, model })
        case 'anthropic':
          return await anthropicProvider(messages, { ...options, model })
        case 'gemini':
          return await geminiProvider(messages, { ...options, model })
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[AI] Provider ${provider} failed, trying next. Error: ${lastError.message}`)
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`)
}
