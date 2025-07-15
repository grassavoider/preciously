import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { VisualNovelSchema } from '@preciously/novel-engine';

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
    cb(null, path.join(process.env.UPLOAD_DIR || './uploads', 'covers'));
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

// Create visual novel
router.post('/', requireAuth, upload.single('cover'), async (req, res) => {
  try {
    const novelData = JSON.parse(req.body.novel);
    
    // Validate novel structure
    const validatedNovel = VisualNovelSchema.parse(novelData);
    
    const coverUrl = req.file ? `/uploads/covers/${req.file.filename}` : undefined;
    
    const novel = await prisma.visualNovel.create({
      data: {
        title: validatedNovel.title,
        description: validatedNovel.description,
        coverUrl,
        backgroundUrl: novelData.backgroundUrl || null,
        scenes: JSON.stringify(validatedNovel.scenes), // SQLite compatibility
        tags: JSON.stringify(validatedNovel.tags), // SQLite compatibility
        creatorId: req.session.userId,
        characterId: req.body.characterId || null
      }
    });
    
    res.json(novel);
  } catch (error) {
    console.error('Create novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get visual novels
router.get('/', async (req, res) => {
  try {
    const { search, tags, limit = 20, offset = 0 } = req.query;
    
    const where: any = {
      isPublic: true
    };
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (tags) {
      // SQLite doesn't support array operations, so we'll skip tag filtering for now
      // TODO: Implement tag filtering with a separate table or JSON operations
    }
    
    const [novels, total] = await Promise.all([
      prisma.visualNovel.findMany({
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
          character: {
            select: {
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
    
    // Map creator.id to creatorId for frontend compatibility
    const mappedNovels = novels.map(novel => ({
      ...novel,
      creatorId: novel.creator.id
    }));
    
    res.json({
      novels: mappedNovels,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('List novels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get novel by ID
router.get('/:id', async (req, res) => {
  try {
    const novel = await prisma.visualNovel.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: {
            username: true
          }
        },
        character: true,
        _count: {
          select: {
            conversations: true,
            ratings: true
          }
        }
      }
    });
    
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    // Calculate average rating
    const ratings = await prisma.rating.aggregate({
      where: { novelId: novel.id },
      _avg: { rating: true }
    });
    
    res.json({
      ...novel,
      averageRating: ratings._avg.rating || 0
    });
  } catch (error) {
    console.error('Get novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Play novel (increment play count)
router.post('/:id/play', async (req, res) => {
  try {
    const novel = await prisma.visualNovel.update({
      where: { id: req.params.id },
      data: {
        playCount: {
          increment: 1
        }
      }
    });
    
    res.json(novel);
  } catch (error) {
    console.error('Play novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate novel
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }
    
    const novel = await prisma.visualNovel.findUnique({
      where: { id: req.params.id }
    });
    
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    const ratingData = await prisma.rating.upsert({
      where: {
        userId_novelId: {
          userId: req.session.userId,
          novelId: req.params.id
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
        novelId: req.params.id
      }
    });
    
    res.json(ratingData);
  } catch (error) {
    console.error('Rate novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update novel
router.put('/:id', requireAuth, upload.single('cover'), async (req, res) => {
  try {
    const novel = await prisma.visualNovel.findUnique({
      where: { id: req.params.id }
    });
    
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    if (novel.creatorId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const updateData = JSON.parse(req.body.novel);
    if (req.file) {
      updateData.coverUrl = `/uploads/covers/${req.file.filename}`;
    }
    
    const updated = await prisma.visualNovel.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Update novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete novel
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const novel = await prisma.visualNovel.findUnique({
      where: { id: req.params.id }
    });
    
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    if (novel.creatorId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await prisma.visualNovel.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Novel deleted successfully' });
  } catch (error) {
    console.error('Delete novel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or create conversation for a novel
router.get('/:id/conversation', requireAuth, async (req, res) => {
  try {
    const novel = await prisma.visualNovel.findUnique({
      where: { id: req.params.id },
      include: {
        character: true
      }
    });
    
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    // Find existing conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        visualNovelId: req.params.id,
        userId: req.session.userId
      }
    });
    
    if (conversation) {
      res.json(conversation);
    } else {
      // Return null to indicate no conversation exists
      res.json(null);
    }
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create conversation
router.post('/:id/conversation', requireAuth, async (req, res) => {
  try {
    const { currentSceneId, messages, variables } = req.body;
    
    const novel = await prisma.visualNovel.findUnique({
      where: { id: req.params.id }
    });
    
    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }
    
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.session.userId,
        visualNovelId: req.params.id,
        characterId: novel.characterId,
        messages: messages || '[]',
        lastMessage: '',
        currentSceneId,
        variables: variables || '{}'
      }
    });
    
    res.json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update conversation
router.put('/:novelId/conversation/:conversationId', requireAuth, async (req, res) => {
  try {
    const { currentSceneId, messages, variables } = req.body;
    
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.conversationId }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (conversation.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Extract last message for quick reference
    let lastMessage = '';
    try {
      const msgs = JSON.parse(messages || '[]');
      if (msgs.length > 0) {
        lastMessage = msgs[msgs.length - 1].content || '';
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    const updated = await prisma.conversation.update({
      where: { id: req.params.conversationId },
      data: {
        currentSceneId,
        messages,
        variables,
        lastMessage
      }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;