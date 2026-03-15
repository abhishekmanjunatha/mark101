export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'gemini'

export type AIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIRequestOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
  provider?: AIProvider
}

export type AIResponse = {
  content: string
  provider: AIProvider
  model: string
}
