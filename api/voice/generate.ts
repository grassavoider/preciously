import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../../backend/src/lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text, voiceId, modelId, settings } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    // If no ElevenLabs API key, return fallback TTS URL
    if (!process.env.ELEVENLABS_API_KEY) {
      const encodedText = encodeURIComponent(text);
      return res.json({ 
        url: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`,
        fallback: true,
        message: 'Using fallback TTS service. Configure ElevenLabs API key for better quality.'
      });
    }

    // Use ElevenLabs API
    const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice (Rachel)
    const selectedModelId = modelId || 'eleven_multilingual_v2';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: selectedModelId,
          voice_settings: {
            stability: settings?.stability || 0.5,
            similarity_boost: settings?.similarity_boost || 0.75,
            style: settings?.style || 0.0,
            use_speaker_boost: settings?.use_speaker_boost || true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to generate speech: ${response.statusText} - ${error}`);
    }

    // Stream the audio response
    const audioBuffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength.toString());
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
}