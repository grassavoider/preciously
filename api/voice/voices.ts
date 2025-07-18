import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../../backend/src/lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // If no ElevenLabs API key, return default voices
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.json({
        voices: [
          { voice_id: 'rachel', name: 'Rachel (Female)', labels: { gender: 'female' } },
          { voice_id: 'josh', name: 'Josh (Male)', labels: { gender: 'male' } },
          { voice_id: 'bella', name: 'Bella (Female)', labels: { gender: 'female' } },
          { voice_id: 'adam', name: 'Adam (Male)', labels: { gender: 'male' } },
        ]
      });
    }

    // Fetch from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list voices: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error listing voices:', error);
    res.status(500).json({ error: 'Failed to list voices' });
  }
}