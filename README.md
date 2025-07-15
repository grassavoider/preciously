# Preciously.ai - AI Visual Novel Platform 🎮

An AI-powered visual novel platform that combines character cards, AI generation, and interactive storytelling.

## Features ✨

- **AI Text Generation**: Powered by OpenRouter API with support for multiple models
- **AI Image Generation**: Character sprites and backgrounds using AI
- **Character Cards**: Import and use CharX files and PNG character cards
- **Visual Novel Engine**: Create visual novels manually or with AI assistance
- **Dual Display Modes**: Traditional VN style or interactive chat mode
- **User Management**: Sign up, sign in, and manage your creations
- **Rating System**: Rate and review characters and visual novels

## Quick Start for New Contributors 🚀

### Prerequisites
You only need these two things:
1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Git** - [Download here](https://git-scm.com/)

### Super Easy Setup (5 minutes!)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/preciously.ai.git
   cd preciously.ai
   ```

2. **Install everything with one command**
   ```bash
   npm install
   ```
   This automatically installs all packages for frontend, backend, and shared packages!

3. **Set up your API key**
   ```bash
   # Windows
   copy backend\.env.example backend\.env
   
   # Mac/Linux
   cp backend/.env.example backend/.env
   ```
   
   Open `backend/.env` in any text editor and add your OpenRouter API key:
   - Get a free API key from [OpenRouter](https://openrouter.ai/)
   - Replace `your_key_here` with your actual key

4. **Set up the database** (one command!)
   ```bash
   npm run setup
   ```

5. **Start everything**
   ```bash
   npm run dev
   ```

That's it! Visit http://localhost:3000 to see the app! 🎉

### Default Admin Login
- Username: `username`
- Password: `password`

## Troubleshooting 🔧

### "npm install" fails
- Make sure you have Node.js v18+: Run `node --version` to check
- Try: `npm cache clean --force` then `npm install` again

### "npm run dev" fails
- Make sure ports 3000 and 3001 are free
- Windows: The backend might still be running. Use `npm run stop` to kill it
- Try: `npm run setup` to ensure database is ready

### Can't see images
- The app uses free AI image generation by default
- For better quality, add an OpenAI API key to `.env`

## Project Structure

```
preciously.ai/
├── backend/          # Express.js backend
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   └── index.ts  # Server entry point
│   └── prisma/       # Database schema
├── frontend/         # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       └── hooks/
└── packages/         # Shared packages
    └── novel-engine/ # Visual novel engine
```

## API Documentation

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Characters
- `GET /api/characters` - List public characters
- `POST /api/characters` - Create character
- `POST /api/characters/import` - Import CharX/PNG character
- `GET /api/characters/:id` - Get character details
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character
- `POST /api/characters/:id/rate` - Rate character

### Visual Novels
- `GET /api/novels` - List public novels
- `POST /api/novels` - Create novel
- `GET /api/novels/:id` - Get novel details
- `PUT /api/novels/:id` - Update novel
- `DELETE /api/novels/:id` - Delete novel
- `POST /api/novels/:id/play` - Play novel
- `POST /api/novels/:id/rate` - Rate novel

### AI Generation
- `POST /api/generate/text` - Generate text with AI
- `POST /api/generate/image` - Generate images
- `GET /api/models` - List available models

## Development Scripts 📝

All commands run from the root directory:

| Command | What it does |
|---------|--------------||
| `npm install` | Install all dependencies |
| `npm run dev` | Start frontend + backend |
| `npm run setup` | Set up database |
| `npm run stop` | Stop backend server (Windows) |
| `npm run build` | Build for production |

## Contributing 🤝

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/cool-feature`
3. **Commit** your changes: `git commit -m 'Add cool feature'`
4. **Push** to the branch: `git push origin feature/cool-feature`
5. **Open** a Pull Request

### First time contributing?
- Look for issues labeled `good first issue`
- Check out [CLAUDE.md](./CLAUDE.md) for detailed documentation
- Ask questions in issues - we're here to help!

## Need Help? 💬

- 📖 [Detailed Documentation](./CLAUDE.md)
- 🐛 [Report Issues](https://github.com/yourusername/preciously.ai/issues)
- 💡 [Request Features](https://github.com/yourusername/preciously.ai/issues/new)

## License 📄

MIT License - see [LICENSE](./LICENSE) file for details