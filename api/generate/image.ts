import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, setCorsHeaders } from '../../backend/src/lib/auth';
import { OpenRouterService } from '../../backend/src/services/openrouter';

const openRouterService = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultTextModel: process.env.DEFAULT_TEXT_MODEL,
  defaultImageModel: process.env.DEFAULT_IMAGE_MODEL,
  defaultVoiceModel: process.env.DEFAULT_VOICE_MODEL
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireAuth(req, res);
    if (!authUser) return;

    const result = await openRouterService.generateImage(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message || 'Image generation failed' });
  }
}