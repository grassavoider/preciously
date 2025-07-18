export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: 'FREE' | 'PAID';
  type: 'text' | 'image' | 'voice';
  description?: string;
}

export const MODEL_CONFIGS: ModelConfig[] = [
  // Free tier models
  {
    id: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    provider: 'qwen',
    tier: 'FREE',
    type: 'text',
    description: 'Fast and capable open-source model'
  },
  {
    id: 'meta-llama/llama-3.2-3b-instruct',
    name: 'Llama 3.2 3B',
    provider: 'meta-llama',
    tier: 'FREE',
    type: 'text',
    description: 'Lightweight model for simple tasks'
  },
  
  // Paid tier models
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    tier: 'PAID',
    type: 'text',
    description: 'Advanced reasoning model with superior capabilities'
  },
  {
    id: 'anthropic/claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    tier: 'PAID',
    type: 'text',
    description: 'Most capable Claude model for complex tasks'
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    tier: 'PAID',
    type: 'text',
    description: 'Latest GPT-4 with vision capabilities'
  },
  
  // Image models (all paid for now)
  {
    id: 'openai/dall-e-3',
    name: 'DALL-E 3',
    provider: 'openai',
    tier: 'PAID',
    type: 'image',
    description: 'High-quality image generation'
  }
];

export function getAvailableModels(userTier: 'FREE' | 'PAID', type?: 'text' | 'image' | 'voice'): ModelConfig[] {
  return MODEL_CONFIGS.filter(model => {
    const tierMatch = userTier === 'PAID' || model.tier === 'FREE';
    const typeMatch = !type || model.type === type;
    return tierMatch && typeMatch;
  });
}

export function isModelAllowed(modelId: string, userTier: 'FREE' | 'PAID'): boolean {
  const model = MODEL_CONFIGS.find(m => m.id === modelId);
  if (!model) return false;
  return userTier === 'PAID' || model.tier === 'FREE';
}