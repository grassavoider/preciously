import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, setCorsHeaders } from '../../backend/src/lib/auth';
import { CharacterCardService } from '../../backend/src/services/characterCard';
import { supabaseAdmin } from '../../backend/src/lib/supabase';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

    const { fileData, mimeType, fileName } = req.body;
    
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');
    
    let characterData = null;
    let avatarUrl = undefined;
    
    // Extract character data
    if (mimeType === 'image/png') {
      characterData = await CharacterCardService.extractFromPNGBuffer(buffer);
      
      // Upload PNG as avatar
      const avatarFileName = `${authUser.id}/import-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(avatarFileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (!uploadError && uploadData) {
        const { data: urlData } = supabaseAdmin.storage
          .from('avatars')
          .getPublicUrl(avatarFileName);
        avatarUrl = urlData.publicUrl;
      }
    } else if (fileName?.endsWith('.charx') || mimeType === 'application/json') {
      characterData = await CharacterCardService.parseCharXBuffer(buffer);
    }
    
    if (!characterData || !CharacterCardService.validateCharacterCard(characterData)) {
      return res.status(400).json({ error: 'Invalid character file' });
    }
    
    // Return the extracted character data for frontend to review
    res.status(200).json({
      name: characterData.name,
      description: characterData.description,
      personality: characterData.personality || '',
      scenario: characterData.scenario || '',
      firstMessage: characterData.first_mes || '',
      messageExample: characterData.mes_example || '',
      systemPrompt: characterData.system_prompt || '',
      creatorNotes: characterData.creator_notes || '',
      tags: characterData.tags || [],
      avatarUrl
    });
  } catch (error) {
    console.error('Import character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}