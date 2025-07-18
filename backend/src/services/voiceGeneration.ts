import fetch from 'node-fetch';

interface VoiceGenerationParams {
  text: string;
  voiceId?: string;
  modelId?: string;
  settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

interface VoiceListResponse {
  voices: Array<{
    voice_id: string;
    name: string;
    labels: Record<string, string>;
    preview_url: string;
  }>;
}

export class VoiceGenerationService {
  private apiKey: string | undefined;
  private apiUrl = 'https://api.elevenlabs.io/v1';
  
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
  }

  async listVoices(): Promise<VoiceListResponse | null> {
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list voices: ${response.statusText}`);
      }

      return await response.json() as VoiceListResponse;
    } catch (error) {
      console.error('Error listing voices:', error);
      return null;
    }
  }

  async generateSpeech(params: VoiceGenerationParams): Promise<Buffer | null> {
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured');
      return null;
    }

    const voiceId = params.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice (Rachel)
    const modelId = params.modelId || 'eleven_multilingual_v2';

    try {
      const response = await fetch(
        `${this.apiUrl}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: params.text,
            model_id: modelId,
            voice_settings: {
              stability: params.settings?.stability || 0.5,
              similarity_boost: params.settings?.similarity_boost || 0.75,
              style: params.settings?.style || 0.0,
              use_speaker_boost: params.settings?.use_speaker_boost || true,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to generate speech: ${response.statusText} - ${error}`);
      }

      const audioBuffer = await response.buffer();
      return audioBuffer;
    } catch (error) {
      console.error('Error generating speech:', error);
      return null;
    }
  }

  async generateCharacterVoice(characterName: string, text: string, personality?: string): Promise<Buffer | null> {
    // Try to find a voice that matches the character's personality
    const voices = await this.listVoices();
    
    if (!voices) {
      return null;
    }

    // Simple voice selection based on character name or personality
    let selectedVoice = voices.voices[0]?.voice_id;
    
    // You could implement more sophisticated voice selection here
    // For example, based on personality traits, gender, age, etc.
    if (personality) {
      const lowerPersonality = personality.toLowerCase();
      
      // Example voice matching logic
      if (lowerPersonality.includes('female') || lowerPersonality.includes('woman')) {
        const femaleVoice = voices.voices.find(v => 
          v.labels.gender === 'female' || v.name.includes('Rachel') || v.name.includes('Bella')
        );
        if (femaleVoice) selectedVoice = femaleVoice.voice_id;
      } else if (lowerPersonality.includes('male') || lowerPersonality.includes('man')) {
        const maleVoice = voices.voices.find(v => 
          v.labels.gender === 'male' || v.name.includes('Adam') || v.name.includes('Josh')
        );
        if (maleVoice) selectedVoice = maleVoice.voice_id;
      }
      
      // Match based on personality traits
      if (lowerPersonality.includes('young') || lowerPersonality.includes('energetic')) {
        // Select a younger-sounding voice
        const youngVoice = voices.voices.find(v => 
          v.labels.age === 'young' || v.name.includes('Elli')
        );
        if (youngVoice) selectedVoice = youngVoice.voice_id;
      }
    }

    return this.generateSpeech({
      text,
      voiceId: selectedVoice,
    });
  }

  // Generate a preview URL for voice (for frontend playback)
  async generatePreviewUrl(text: string, voiceId?: string): Promise<string | null> {
    if (!this.apiKey) {
      // Return a mock TTS URL for development
      const encodedText = encodeURIComponent(text);
      return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;
    }

    // For production, you'd generate and upload to a CDN
    // For now, return null to indicate we need to handle this differently
    return null;
  }
}

export default new VoiceGenerationService();