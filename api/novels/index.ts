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
      const { search, limit = '20', offset = '0', characterId } = req.query;
      
      const where: any = {
        isPublic: true
      };
      
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }
      
      if (characterId) {
        where.characterId = characterId as string;
      }
      
      const [novels, total] = await Promise.all([
        prisma.visualNovel.findMany({
          where,
          take: Number(limit),
          skip: Number(offset),
          include: {
            author: {
              select: {
                id: true,
                username: true
              }
            },
            character: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
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
            playCount: 'desc'
          }
        }),
        prisma.visualNovel.count({ where })
      ]);
      
      // Parse JSON fields
      const mappedNovels = novels.map(novel => ({
        ...novel,
        scenes: JSON.parse(novel.scenes || '[]'),
        tags: JSON.parse(novel.tags || '[]'),
        authorId: novel.author.id
      }));
      
      return res.status(200).json({
        novels: mappedNovels,
        total,
        limit: Number(limit),
        offset: Number(offset)
      });
    }

    if (req.method === 'POST') {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;

      const novelData = JSON.parse(req.body.novel || '{}');
      
      // Handle background upload via Supabase Storage
      let backgroundUrl = novelData.backgroundUrl;
      
      if (req.body.backgroundBase64) {
        const buffer = Buffer.from(req.body.backgroundBase64, 'base64');
        const fileName = `${authUser.id}/novel-${Date.now()}.png`;
        
        const { data, error } = await supabaseAdmin.storage
          .from('backgrounds')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });
        
        if (!error && data) {
          const { data: urlData } = supabaseAdmin.storage
            .from('backgrounds')
            .getPublicUrl(fileName);
          backgroundUrl = urlData.publicUrl;
        }
      }
      
      const novel = await prisma.visualNovel.create({
        data: {
          title: novelData.title,
          description: novelData.description,
          scenes: JSON.stringify(novelData.scenes || []),
          tags: JSON.stringify(novelData.tags || []),
          isPublic: novelData.isPublic || false,
          backgroundUrl,
          authorId: authUser.id,
          characterId: novelData.characterId
        },
        include: {
          author: {
            select: {
              id: true,
              username: true
            }
          },
          character: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });
      
      return res.status(201).json({
        ...novel,
        scenes: JSON.parse(novel.scenes),
        tags: JSON.parse(novel.tags)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Novels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}