import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { requireAuth, setCorsHeaders, verifyAuth } from '../../backend/src/lib/auth';

const prisma = new PrismaClient();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid novel ID' });
  }

  try {
    if (req.method === 'GET') {
      const novel = await prisma.visualNovel.findUnique({
        where: { id },
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
              description: true,
              avatarUrl: true,
              personality: true,
              scenario: true,
              firstMessage: true
            }
          },
          ratings: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          }
        }
      });

      if (!novel) {
        return res.status(404).json({ error: 'Novel not found' });
      }

      // Check if private novel
      const authUser = await verifyAuth(req);
      if (!novel.isPublic && (!authUser || authUser.id !== novel.authorId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Parse JSON fields
      const response = {
        ...novel,
        scenes: JSON.parse(novel.scenes || '[]'),
        tags: JSON.parse(novel.tags || '[]')
      };

      return res.status(200).json(response);
    }

    if (req.method === 'PUT') {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;

      const novel = await prisma.visualNovel.findUnique({
        where: { id }
      });

      if (!novel) {
        return res.status(404).json({ error: 'Novel not found' });
      }

      if (novel.authorId !== authUser.id && authUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updateData = req.body;
      if (updateData.scenes) {
        updateData.scenes = JSON.stringify(updateData.scenes);
      }
      if (updateData.tags) {
        updateData.tags = JSON.stringify(updateData.tags);
      }

      const updated = await prisma.visualNovel.update({
        where: { id },
        data: updateData,
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

      return res.status(200).json({
        ...updated,
        scenes: JSON.parse(updated.scenes),
        tags: JSON.parse(updated.tags)
      });
    }

    if (req.method === 'DELETE') {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;

      const novel = await prisma.visualNovel.findUnique({
        where: { id }
      });

      if (!novel) {
        return res.status(404).json({ error: 'Novel not found' });
      }

      if (novel.authorId !== authUser.id && authUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.visualNovel.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Novel deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Novel operation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}