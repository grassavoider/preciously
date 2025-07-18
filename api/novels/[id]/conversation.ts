import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { requireAuth, setCorsHeaders } from '../../../backend/src/lib/auth';

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

  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  try {
    if (req.method === 'GET') {
      // Get existing conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          novelId: id,
          userId: authUser.id
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      if (conversation) {
        return res.status(200).json({
          ...conversation,
          messages: JSON.parse(conversation.messages || '[]'),
          variables: JSON.parse(conversation.variables || '{}')
        });
      }

      return res.status(404).json({ error: 'No conversation found' });
    }

    if (req.method === 'POST') {
      // Create new conversation
      const { currentSceneId, messages = [], variables = {} } = req.body;

      const conversation = await prisma.conversation.create({
        data: {
          userId: authUser.id,
          novelId: id,
          characterId: req.body.characterId,
          currentSceneId: currentSceneId || 'scene-1',
          messages: JSON.stringify(messages),
          variables: JSON.stringify(variables)
        }
      });

      return res.status(201).json({
        ...conversation,
        messages: JSON.parse(conversation.messages),
        variables: JSON.parse(conversation.variables)
      });
    }

    if (req.method === 'PUT') {
      // Update existing conversation
      const { conversationId } = req.query;
      if (!conversationId || typeof conversationId !== 'string') {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }

      const { currentSceneId, messages, variables } = req.body;

      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          currentSceneId,
          messages: JSON.stringify(messages),
          variables: JSON.stringify(variables)
        }
      });

      return res.status(200).json({
        ...conversation,
        messages: JSON.parse(conversation.messages),
        variables: JSON.parse(conversation.variables)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}