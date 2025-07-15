import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { CharacterCardService } from '../services/characterCard';

const router = Router();
const prisma = new PrismaClient();

// Middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.env.UPLOAD_DIR || './uploads', 'avatars'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760')
  }
});

// Get character by ID
router.get('/:id', async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
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
      }
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Calculate average rating
    const ratings = await prisma.rating.aggregate({
      where: { characterId: character.id },
      _avg: { rating: true }
    });
    
    res.json({
      ...character,
      averageRating: ratings._avg.rating || 0
    });
  } catch (error) {
    console.error('Get character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update character
router.put('/:id', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id }
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    if (character.creatorId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const updateData = JSON.parse(req.body.character);
    if (req.file) {
      updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }
    
    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Update character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete character
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id }
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    if (character.creatorId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await prisma.character.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate character
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }
    
    const character = await prisma.character.findUnique({
      where: { id: req.params.id }
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const ratingData = await prisma.rating.upsert({
      where: {
        userId_characterId: {
          userId: req.session.userId,
          characterId: req.params.id
        }
      },
      update: {
        rating,
        review
      },
      create: {
        rating,
        review,
        userId: req.session.userId,
        characterId: req.params.id
      }
    });
    
    res.json(ratingData);
  } catch (error) {
    console.error('Rate character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get character conversations
router.get('/:id/conversations', requireAuth, async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id }
    });
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const conversations = await prisma.conversation.findMany({
      where: {
        characterId: req.params.id,
        userId: req.session.userId
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download character (increment download count)
router.post('/:id/download', async (req, res) => {
  try {
    const character = await prisma.character.update({
      where: { id: req.params.id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    });
    
    // Return character data in CharX format
    const charXData = {
      name: character.name,
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.firstMessage,
      mes_example: character.messageExample,
      system_prompt: character.systemPrompt,
      creator_notes: character.creatorNotes,
      tags: character.tags,
      creator: character.creatorId,
      character_version: '1.0'
    };
    
    res.json(charXData);
  } catch (error) {
    console.error('Download character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;