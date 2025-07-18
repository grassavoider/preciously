import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../../backend/src/lib/auth';

interface Voice {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { characterName, text, personality } = req.body;
    
    if (!text || !characterName) {
      return res.status(400).json({ error: 'Character name and text are required' });
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

    // Get available voices
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    if (!voicesResponse.ok) {
      throw new Error('Failed to fetch voices');
    }

    const { voices } = await voicesResponse.json() as { voices: Voice[] };
    
    // Simple voice selection based on character name or personality
    let selectedVoiceId = voices[0]?.voice_id || '21m00Tcm4TlvDq8ikWAM';
    
    if (personality) {
      const lowerPersonality = personality.toLowerCase();
      
      // Gender-based selection
      if (lowerPersonality.includes('female') || lowerPersonality.includes('woman')) {
        const femaleVoice = voices.find(v => 
          v.labels.gender === 'female' || v.name.includes('Rachel') || v.name.includes('Bella')
        );
        if (femaleVoice) selectedVoiceId = femaleVoice.voice_id;
      } else if (lowerPersonality.includes('male') || lowerPersonality.includes('man')) {
        const maleVoice = voices.find(v => 
          v.labels.gender === 'male' || v.name.includes('Adam') || v.name.includes('Josh')
        );
        if (maleVoice) selectedVoiceId = maleVoice.voice_id;
      }
      
      // Age-based selection
      if (lowerPersonality.includes('young') || lowerPersonality.includes('energetic')) {
        const youngVoice = voices.find(v => 
          v.labels.age === 'young' || v.name.includes('Elli')
        );
        if (youngVoice) selectedVoiceId = youngVoice.voice_id;
      }
    }

    // Generate speech with selected voice
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
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
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
    console.error('Error generating character speech:', error);
    res.status(500).json({ error: 'Failed to generate character speech' });
  }
}