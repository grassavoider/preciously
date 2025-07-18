import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import voiceGenerationService from '../services/voiceGeneration';
import multer from 'multer';

const router = Router();

// List available voices
router.get('/voices', isAuthenticated, async (req, res) => {
  try {
    const voices = await voiceGenerationService.listVoices();
    
    if (!voices) {
      return res.json({
        voices: [
          // Default voices when API key not configured
          { voice_id: 'rachel', name: 'Rachel (Female)', labels: { gender: 'female' } },
          { voice_id: 'josh', name: 'Josh (Male)', labels: { gender: 'male' } },
          { voice_id: 'bella', name: 'Bella (Female)', labels: { gender: 'female' } },
          { voice_id: 'adam', name: 'Adam (Male)', labels: { gender: 'male' } },
        ]
      });
    }
    
    res.json(voices);
  } catch (error) {
    console.error('Error listing voices:', error);
    res.status(500).json({ error: 'Failed to list voices' });
  }
});

// Generate speech from text
router.post('/generate', isAuthenticated, async (req, res) => {
  try {
    const { text, voiceId, modelId, settings } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    const audioBuffer = await voiceGenerationService.generateSpeech({
      text,
      voiceId,
      modelId,
      settings,
    });

    if (!audioBuffer) {
      // Return a URL to a fallback TTS service
      const fallbackUrl = await voiceGenerationService.generatePreviewUrl(text, voiceId);
      return res.json({ 
        url: fallbackUrl,
        fallback: true,
        message: 'Using fallback TTS service. Configure ElevenLabs API key for better quality.'
      });
    }

    // Set appropriate headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// Generate speech for a specific character
router.post('/generate/character', isAuthenticated, async (req, res) => {
  try {
    const { characterName, text, personality } = req.body;
    
    if (!text || !characterName) {
      return res.status(400).json({ error: 'Character name and text are required' });
    }

    const audioBuffer = await voiceGenerationService.generateCharacterVoice(
      characterName,
      text,
      personality
    );

    if (!audioBuffer) {
      // Return a URL to a fallback TTS service
      const fallbackUrl = await voiceGenerationService.generatePreviewUrl(text);
      return res.json({ 
        url: fallbackUrl,
        fallback: true,
        message: 'Using fallback TTS service. Configure ElevenLabs API key for better quality.'
      });
    }

    // Set appropriate headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating character speech:', error);
    res.status(500).json({ error: 'Failed to generate character speech' });
  }
});

// Generate preview URL for text (lightweight alternative)
router.post('/preview', isAuthenticated, async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const url = await voiceGenerationService.generatePreviewUrl(text, voiceId);
    
    res.json({ url });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

export default router;