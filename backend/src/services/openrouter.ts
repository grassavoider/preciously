import fetch from 'node-fetch';
import { z } from 'zod';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterConfig {
  apiKey: string;
  defaultTextModel?: string;
  defaultImageModel?: string;
  defaultVoiceModel?: string;
}

const TextGenerationSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  top_p: z.number().optional(),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional()
});

const ImageGenerationSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  size: z.enum(['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']).optional(),
  n: z.number().optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional()
});

export class OpenRouterService {
  private config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    this.config = config;
  }

  async generateText(params: z.infer<typeof TextGenerationSchema>) {
    const model = params.model || this.config.defaultTextModel;
    
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://preciously.ai',
        'X-Title': 'Preciously.ai'
      },
      body: JSON.stringify({
        ...params,
        model
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    return response.json();
  }

  async generateImage(params: z.infer<typeof ImageGenerationSchema>) {
    // OpenRouter doesn't support image generation, so we'll use alternatives
    
    try {
      // Option 1: Check if OpenAI API key is available for direct DALL-E 3 access
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (OPENAI_API_KEY && params.model?.includes('dall-e')) {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: params.prompt,
            size: params.size || '1024x1024',
            quality: params.quality || 'standard',
            style: params.style || 'vivid',
            n: 1
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          return result;
        } else {
          console.error('OpenAI API error:', await response.text());
        }
      }
      
      // Option 2: Use Pollinations.ai (free, no API key required)
      const enhancedPrompt = encodeURIComponent(params.prompt);
      const width = params.size?.split('x')[0] || '1024';
      const height = params.size?.split('x')[1] || '1024';
      
      // Pollinations.ai provides free AI image generation
      const imageUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=${width}&height=${height}&nologo=true&model=turbo`;
      
      // Test if the URL is accessible
      const testResponse = await fetch(imageUrl, { method: 'HEAD' });
      if (testResponse.ok) {
        return {
          data: [{
            url: imageUrl,
            revised_prompt: params.prompt
          }]
        };
      }
      
    } catch (error) {
      console.error('Image generation error:', error);
    }
    
    // Fallback to a more descriptive placeholder
    return {
      data: [{
        url: `https://via.placeholder.com/1024x1024/1a1a2e/eee?text=${encodeURIComponent(params.prompt.slice(0, 30))}`
      }]
    };
  }

  async generateVoice(text: string, voice?: string) {
    // OpenRouter doesn't directly support voice generation
    // This would need to be implemented with a separate service
    // For now, we'll throw an error indicating this needs implementation
    throw new Error('Voice generation not yet implemented. Consider using ElevenLabs API directly.');
  }

  async listModels() {
    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://preciously.ai',
        'X-Title': 'Preciously.ai'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    return response.json();
  }
}