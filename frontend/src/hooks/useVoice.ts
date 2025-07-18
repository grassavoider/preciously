import { useState } from 'react';
import axios from '@/lib/axios';

interface Voice {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  preview_url?: string;
}

interface VoiceGenerateOptions {
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

interface CharacterVoiceOptions {
  characterName: string;
  text: string;
  personality?: string;
}

export function useVoice() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const { data } = await axios.get<{ voices: Voice[] }>('/api/voice/voices');
      setVoices(data.voices);
      return data.voices;
    } catch (error) {
      console.error('Failed to load voices:', error);
      return [];
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const generateSpeech = async (options: VoiceGenerateOptions): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const response = await axios.post('/api/voice/generate', options, {
        responseType: 'arraybuffer'
      });

      // Check if we got a URL response (fallback TTS)
      if (response.headers['content-type']?.includes('application/json')) {
        const text = new TextDecoder().decode(response.data);
        const data = JSON.parse(text);
        return data.url;
      }

      // Create blob URL from audio data
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error('Failed to generate speech:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCharacterVoice = async (options: CharacterVoiceOptions): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const response = await axios.post('/api/voice/character', options, {
        responseType: 'arraybuffer'
      });

      // Check if we got a URL response (fallback TTS)
      if (response.headers['content-type']?.includes('application/json')) {
        const text = new TextDecoder().decode(response.data);
        const data = JSON.parse(text);
        return data.url;
      }

      // Create blob URL from audio data
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error('Failed to generate character voice:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const getPreviewUrl = async (text: string, voiceId?: string): Promise<string | null> => {
    try {
      const { data } = await axios.post<{ url: string }>('/api/voice/preview', {
        text,
        voiceId
      });
      return data.url;
    } catch (error) {
      console.error('Failed to get preview URL:', error);
      return null;
    }
  };

  return {
    voices,
    isLoadingVoices,
    isGenerating,
    loadVoices,
    generateSpeech,
    generateCharacterVoice,
    getPreviewUrl
  };
}