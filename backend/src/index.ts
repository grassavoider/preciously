import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';

// Load environment variables
dotenv.config();

// Import services
import { OpenRouterService } from './services/openrouter';
import { CharacterCardService } from './services/characterCard';

// Import routes
import characterRoutes from './routes/characters';
import novelRoutes from './routes/novels';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenRouter service
const openRouterService = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultTextModel: process.env.DEFAULT_TEXT_MODEL,
  defaultImageModel: process.env.DEFAULT_IMAGE_MODEL,
  defaultVoiceModel: process.env.DEFAULT_VOICE_MODEL
});

// Create upload directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
try {
  mkdirSync(uploadDir, { recursive: true });
  mkdirSync(path.join(uploadDir, 'avatars'), { recursive: true });
  mkdirSync(path.join(uploadDir, 'covers'), { recursive: true });
} catch (error) {
  console.error('Error creating upload directories:', error);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'avatar') {
      cb(null, path.join(uploadDir, 'avatars'));
    } else if (file.fieldname === 'cover') {
      cb(null, path.join(uploadDir, 'covers'));
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Initialize admin user on startup
async function initializeAdmin() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminUsername || !adminPassword) {
      console.warn('Admin credentials not configured in environment');
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { username: adminUsername }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          username: adminUsername,
          email: `${adminUsername.toLowerCase()}@preciously.ai`,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId }
  });
  
  if (user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });
    
    // Set session
    req.session.userId = user.id;
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.userId = user.id;
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not sign out' });
    }
    res.json({ message: 'Signed out successfully' });
  });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OpenRouter proxy routes
app.post('/api/generate/text', requireAuth, async (req, res) => {
  try {
    const result = await openRouterService.generateText(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Text generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate/image', requireAuth, async (req, res) => {
  try {
    const result = await openRouterService.generateImage(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models', requireAuth, async (req, res) => {
  try {
    const models = await openRouterService.listModels();
    res.json(models);
  } catch (error: any) {
    console.error('List models error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Character routes
app.post('/api/characters', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const characterData = JSON.parse(req.body.character);
    const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;
    
    // Extract only the fields we need for the database
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
        creatorId: req.session.userId
      }
    });
    
    res.json(character);
  } catch (error) {
    console.error('Create character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/characters/import', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    let characterData = null;
    
    // Try to extract from PNG first
    if (req.file.mimetype === 'image/png') {
      characterData = await CharacterCardService.extractFromPNG(req.file.path);
    } else if (req.file.originalname.endsWith('.charx') || req.file.originalname.endsWith('.json')) {
      characterData = await CharacterCardService.parseCharX(req.file.path);
    }
    
    if (!characterData || !CharacterCardService.validateCharacterCard(characterData)) {
      return res.status(400).json({ error: 'Invalid character file' });
    }
    
    // Return the extracted character data for frontend to review
    res.json({
      name: characterData.name,
      description: characterData.description,
      personality: characterData.personality || '',
      scenario: characterData.scenario || '',
      firstMessage: characterData.first_mes || '',
      messageExample: characterData.mes_example || '',
      systemPrompt: characterData.system_prompt || '',
      creatorNotes: characterData.creator_notes || '',
      tags: characterData.tags || [],
      avatarUrl: req.file.mimetype === 'image/png' ? `/uploads/${req.file.filename}` : undefined
    });
  } catch (error) {
    console.error('Import character error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/characters', async (req, res) => {
  try {
    const { search, tags, limit = 20, offset = 0 } = req.query;
    
    const where: any = {
      isPublic: true
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (tags) {
      const tagArray = (tags as string).split(',');
      where.tags = { hasSome: tagArray };
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
    
    // Map creator.id to creatorId for frontend compatibility
    const mappedCharacters = characters.map(char => ({
      ...char,
      creatorId: char.creator.id
    }));
    
    res.json({
      characters: mappedCharacters,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('List characters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Use route modules
app.use('/api/characters', characterRoutes);
app.use('/api/novels', novelRoutes);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeAdmin();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});