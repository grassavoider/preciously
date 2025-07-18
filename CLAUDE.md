# Preciously.ai - AI Visual Novel Platform

## Project Overview

Preciously.ai is an AI-powered visual novel platform that combines the best features from RISU (character cards, presets, voice) and MIKU (visual novel generation). It allows users to create, share, and play AI-generated visual novels using character cards.

## Key Features

### 1. Character Card System
- **Import Support**: CharX files and PNG character cards (with embedded metadata)
- **Character Management**: Upload, rate, and track conversations
- **Public/Private**: Characters can be public or kept private
- **Ratings & Reviews**: 5-star rating system with reviews

### 2. Visual Novel Engine
- **Scene-based**: Each novel consists of multiple scenes
- **Branching Paths**: Support for choices and multiple routes
- **Variables**: Track player choices and game state
- **Effects**: Visual effects like shake, fade, flash
- **AI Generation**: Create novels from prompts using LLMs

### 3. AI Integration (OpenRouter)
- **Text Generation**: Multiple LLM models via OpenRouter
- **Image Generation**: DALL-E 3 and other models
- **Voice Generation**: Placeholder for ElevenLabs integration
- **Model Selection**: Default models configurable in .env

### 4. User System
- **Authentication**: Signup/signin with sessions
- **Roles**: USER and ADMIN roles
- **Admin Account**: 
  - Username: `username`
  - Password: `password`

## Architecture

```
preciously.ai/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── index.ts        # Main server entry
│   │   ├── routes/         # API route handlers
│   │   │   ├── characters.ts
│   │   │   └── novels.ts
│   │   └── services/       # Business logic
│   │       ├── openrouter.ts    # AI API integration
│   │       └── characterCard.ts # Card parsing
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── frontend/               # React SPA
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/         # Route pages
│       ├── hooks/         # Custom React hooks
│       └── services/      # API clients
│
└── packages/
    └── novel-engine/      # Visual novel logic
        └── src/
            └── index.ts   # Engine & builder classes
```

## Database Schema

### Core Models
- **User**: Authentication and ownership
- **Character**: Character cards with metadata
- **VisualNovel**: Novel data with scenes (JSON)
- **Conversation**: Chat/play history
- **Rating**: User ratings for content

### Relationships
- Users own Characters and VisualNovels
- Characters can be used in VisualNovels
- Conversations track user interactions
- Ratings link users to content

## API Endpoints

### Authentication
```
POST   /api/auth/signup      # Register new user
POST   /api/auth/signin      # Login
POST   /api/auth/signout     # Logout
GET    /api/auth/me          # Get current user
```

### Characters
```
GET    /api/characters       # List public characters
POST   /api/characters       # Create character
POST   /api/characters/import # Import CharX/PNG
GET    /api/characters/:id   # Get character
PUT    /api/characters/:id   # Update character
DELETE /api/characters/:id   # Delete character
POST   /api/characters/:id/rate # Rate character
GET    /api/characters/:id/conversations # Get conversations
POST   /api/characters/:id/download # Download as CharX
```

### Visual Novels
```
GET    /api/novels          # List public novels
POST   /api/novels          # Create novel
GET    /api/novels/:id      # Get novel
PUT    /api/novels/:id      # Update novel
DELETE /api/novels/:id      # Delete novel
POST   /api/novels/:id/play # Play (increment counter)
POST   /api/novels/:id/rate # Rate novel
```

### AI Generation
```
POST   /api/generate/text   # Generate text
POST   /api/generate/image  # Generate images
GET    /api/models          # List available models
```

## Configuration (.env)

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_key_here

# Default Models
DEFAULT_TEXT_MODEL=anthropic/claude-3-opus
DEFAULT_IMAGE_MODEL=openai/dall-e-3
DEFAULT_VOICE_MODEL=elevenlabs/eleven_multilingual_v2

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/preciously_ai
# For development: DATABASE_URL=file:./dev.db

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your_random_secret

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# Admin Configuration
ADMIN_USERNAME=username
ADMIN_PASSWORD=password
```

## Development Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Add your OpenRouter API key
   - Configure database URL

3. **Setup Database**
   ```bash
   cd backend
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

4. **Run Development Servers**
   ```bash
   # From root directory
   pnpm dev
   ```
   - Backend: http://localhost:3001
   - Frontend: http://localhost:3000

## Key Implementation Details

### Character Card Parsing
- **PNG Format**: Looks for 'tEXt' chunks with 'chara' keyword
- **CharX Format**: JSON or compressed JSON with character data
- **Validation**: Ensures name and description are present

### Visual Novel Engine
- **Scene Structure**: Each scene has dialogue, characters, choices
- **Engine Class**: Manages playback, history, variables
- **Builder Class**: Fluent API for creating novels
- **AI Generation**: Placeholder for LLM-based scene generation

### Security
- **Authentication**: Session-based with httpOnly cookies
- **Authorization**: Route-level auth middleware
- **File Upload**: Size limits and type restrictions
- **API Keys**: Stored in environment variables

## Frontend Structure

### Key Components
- **Layout**: Main app layout with navigation
- **HomePage**: Landing page with feature overview
- **CharactersPage**: Browse and search characters
- **NovelsPage**: Browse and search novels
- **NovelBuilderPage**: Create/edit novels
- **NovelPlayerPage**: Play visual novels

### State Management
- **Zustand**: For global state (auth, etc.)
- **React Query**: For server state (planned)
- **Local State**: For component-specific state

## Future Enhancements

### High Priority
1. **Voice Integration**: Implement ElevenLabs API
2. **Visual Novel Player**: Complete player UI
3. **Novel Builder UI**: Drag-drop scene editor
4. **Search & Filters**: Advanced search options

### Medium Priority
1. **Social Features**: Follow users, comments
2. **Collections**: Organize favorites
3. **Export Options**: Download novels
4. **Analytics**: View stats for your content

### Low Priority
1. **Achievements**: Gamification
2. **Themes**: Custom UI themes
3. **Plugins**: Extension system
4. **Mobile Apps**: iOS/Android apps

## Character Import Implementation

### How Character Import Works

1. **PNG Character Cards**
   - Reads tEXt chunks from PNG files
   - Looks for 'chara' or 'ccv3' keywords
   - Decodes base64-encoded JSON data
   - Maps fields: `first_mes` → `firstMessage`, etc.

2. **CharX Files**
   - Parses JSON or compressed JSON
   - Extracts character metadata
   - Supports V2 and V3 specifications

3. **Import Flow**
   - User selects PNG/CharX file
   - Frontend sends to `/api/characters/import`
   - Backend extracts and returns character data
   - Frontend displays data for review
   - User can edit before final import
   - Avatar from PNG is preserved

### Character Card Format (V2/V3)
```json
{
  "name": "Character Name",
  "description": "Character description",
  "personality": "Personality traits",
  "scenario": "Default scenario",
  "first_mes": "First message",
  "mes_example": "Example messages",
  "creator_notes": "Creator's notes",
  "system_prompt": "System instructions",
  "tags": ["tag1", "tag2"]
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL in .env
   - Ensure PostgreSQL is running
   - Try SQLite for development

2. **OpenRouter API Errors**
   - Verify API key is correct
   - Check rate limits
   - Ensure model names are valid

3. **File Upload Issues**
   - Check MAX_FILE_SIZE setting
   - Ensure upload directory exists
   - Verify file permissions

4. **Character Import Not Working**
   - Ensure PNG has valid tEXt chunks
   - Check CharX file is valid JSON
   - Verify character has name and description
   - Use "Extract Data" button for PNG/CharX files

### Debug Commands
```bash
# Check database connection
cd backend && pnpm prisma studio

# Reset database
cd backend && pnpm prisma migrate reset

# Check API health
curl http://localhost:3001/api/health
```

## Image Generation

### Current Implementation

Since OpenRouter doesn't support image generation models, the platform uses alternative approaches:

1. **Pollinations.ai (Default)**: Free AI image generation service
   - No API key required
   - Supports custom sizes
   - Good quality anime-style images
   - Used automatically when no OpenAI key is provided

2. **OpenAI DALL-E 3 (Optional)**: Direct integration
   - Requires `OPENAI_API_KEY` in .env
   - Higher quality images
   - More control over style and quality
   - Automatically used when API key is present

3. **Placeholder Fallback**: Used when other services fail

### Configuration

To use DALL-E 3 directly, add to your `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Recent Fixes

### Voice Generation (NEW)
- Implemented ElevenLabs voice generation integration
- Added voice playback to character detail pages
- Added voice to visual novel dialogue (both VN and chat modes)
- Fallback to Google TTS when ElevenLabs API key not configured
- Voice selection based on character personality
- Voice player component with controls

### Image Generation
- Implemented real image generation using Pollinations.ai (free)
- Added optional OpenAI DALL-E 3 integration
- Removed placeholder-only implementation
- Added fallback mechanism for reliability

### Character Import
- Fixed PNG character card extraction with proper tEXt chunk reading
- Import process now has two steps: extract data → review/edit → save
- Avatar from PNG files is preserved during import
- Form fields autofill when character data is extracted

### UI Fixes
- Added missing CardFooter import in ProfilePage
- Created CharacterDetailPage for viewing individual characters
- Fixed "View Character" button linking in CharactersPage
- Character detail page shows all character information in tabs
- Fixed Select component error (empty string value not allowed)
- Added missing Avatar and Badge components

### Backend Fixes
- Character creation endpoint properly handles all fields
- Tags are JSON stringified for SQLite compatibility
- Character import returns extracted data for review
- Character detail endpoint includes creator ID
- Fixed novels route (removed hasSome for SQLite compatibility)
- Added author field to novel creation
- Fixed OpenRouter model name format

### Visual Novel Features

#### Enhanced Novel Builder (NovelBuilderPageEnhanced)
- **Multi-tab interface**:
  - Basic Info: Title, description, background image
  - Characters: Add existing or create new characters
  - AI Generation: Generate characters, backgrounds, and scenes
  - Preview: Review before creating
  
- **Character Generation**:
  - AI generates complete character profiles from prompts
  - Character image generation (placeholder for now)
  - Manual character creation with all fields
  - Attach existing characters to novels
  
- **Background Generation**:
  - AI-powered background image generation
  - Manual upload support
  - Backgrounds apply to entire novel
  
- **Scene Generation**:
  - AI creates 5-7 scenes with dialogue and choices
  - Supports branching narratives
  - Character-aware scene generation

#### Enhanced Novel Player (NovelPlayerEnhanced)
- **Dual Display Modes**:
  - **VN Mode**: Traditional visual novel display
    - Full-screen backgrounds with filters
    - Character sprites with positions (left/center/right)
    - Text box at bottom with speaker names
    - Typewriter text animation
    - Click to advance or skip text
  - **Chat Mode**: Interactive conversation display
    - Message history with avatars
    - Real-time AI responses
    - Edit and regenerate messages
    
- **Visual Novel Features**:
  - Character sprite animations (floating effect)
  - Scene transitions with animations
  - Background image support per scene
  - Choice buttons for branching paths
  - Auto-advance option
  - Adjustable text speed
  - Sound toggle (placeholder)
  
- **AI Integration**:
  - Real-time character conversations
  - Context-aware responses based on scene
  - Character personality in responses
  - Seamless VN/chat mode switching
  
- **Conversation Management**:
  - GET `/api/novels/:id/conversation` - Get existing conversation
  - POST `/api/novels/:id/conversation` - Create new conversation
  - PUT `/api/novels/:id/conversation/:conversationId` - Update conversation
  - Auto-save every 2 seconds
  - Stores messages, current scene, and story variables

### Server Management
- Created `stop-server.bat` and `stop-server.ps1` scripts
- Added graceful shutdown handlers to backend
- Created `BACKEND_MANAGEMENT.md` with detailed instructions
- Added npm scripts for stopping server processes

## Contributing Guidelines

1. **Code Style**
   - TypeScript for type safety
   - Functional components in React
   - Async/await for promises
   - Proper error handling

2. **Git Workflow**
   - Feature branches
   - Descriptive commits
   - PR with description
   - Code review required

3. **Testing**
   - Unit tests for services
   - Integration tests for API
   - E2E tests for critical paths

## License

MIT License - See LICENSE file for details