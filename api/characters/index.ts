import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { requireAuth, setCorsHeaders } from '../../backend/src/lib/auth';
import { supabaseAdmin } from '../../backend/src/lib/supabase';

const prisma = new PrismaClient();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { search, tags, limit = '20', offset = '0' } = req.query;
      
      const where: any = {
        isPublic: true
      };
      
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }
      
      // For SQLite compatibility, we'll handle tags differently
      if (tags) {
        const tagArray = (tags as string).split(',');
        where.tags = { contains: tagArray[0] }; // Simple contains for now
      }
      
      const [characters, total] = await Promise.all([
        prisma.character.findMany({
          where,
          take: Number(limit),
          skip: Number(offset),
          include: {
            creator: {
              select: {
                id: true,
                username: true
              }
            },
            _count: {
              select: {
                conversations: true,
                ratings: true
              }
            }
          },
          orderBy: {
            downloadCount: 'desc'
          }
        }),
        prisma.character.count({ where })
      ]);
      
      const mappedCharacters = characters.map(char => ({
        ...char,
        creatorId: char.creator.id,
        tags: JSON.parse(char.tags || '[]')
      }));
      
      return res.status(200).json({
        characters: mappedCharacters,
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    }

    if (req.method === 'POST') {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;

      const characterData = JSON.parse(req.body.character || '{}');
      
      // Handle file upload via Supabase Storage
      let avatarUrl = characterData.avatarUrl;
      
      if (req.body.avatarBase64) {
        const buffer = Buffer.from(req.body.avatarBase64, 'base64');
        const fileName = `${authUser.id}/${Date.now()}.png`;
        
        const { data, error } = await supabaseAdmin.storage
          .from('avatars')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });
        
        if (!error && data) {
          const { data: urlData } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = urlData.publicUrl;
        }
      }
      
      const character = await prisma.character.create({
        data: {
          name: characterData.name,
          description: characterData.description,
          personality: characterData.personality || '',
          scenario: characterData.scenario || '',
          firstMessage: characterData.firstMessage || '',
          messageExample: characterData.messageExample || '',
          systemPrompt: characterData.systemPrompt || '',
          creatorNotes: characterData.creatorNotes || '',
          tags: JSON.stringify(characterData.tags || []),
          isPublic: characterData.isPublic || false,
          avatarUrl,
          creatorId: authUser.id
        }
      });
      
      return res.status(201).json(character);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Characters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}