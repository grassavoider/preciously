# Vercel Deployment Guide

## Overview

The backend has been migrated from Express to Vercel serverless functions. This guide explains the changes and how to deploy.

## Key Changes

### 1. API Structure
- **Before**: Single Express server at `backend/src/index.ts`
- **After**: Individual serverless functions in `api/` directory

### 2. Authentication
- **Before**: Session-based with cookies
- **After**: JWT tokens stored in localStorage

### 3. File Structure
```
api/
├── health.ts              # Health check endpoint
├── auth/
│   ├── signup.ts         # User registration
│   ├── signin.ts         # User login
│   └── me.ts            # Get current user
├── characters/
│   ├── index.ts         # List/create characters
│   ├── [id].ts          # Get/update/delete character
│   └── import.ts        # Import character files
├── novels/
│   ├── index.ts         # List/create novels
│   └── [id].ts          # Get/update/delete novel
└── generate/
    ├── text.ts          # AI text generation
    └── image.ts         # AI image generation
```

## Local Development

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Run Development Server
```bash
# From root directory
vercel dev
```

This will:
- Start serverless functions on port 3000
- Hot reload on changes
- Use environment variables from `.env`

### 3. Run Frontend Separately
```bash
cd frontend
npm run dev
```

Update frontend to use Vercel dev server:
```env
VITE_API_URL=http://localhost:3000
```

## Production Deployment

### 1. Set up Vercel Project
```bash
vercel
```

Follow prompts to:
- Link to your GitHub repo
- Configure project settings
- Set up environment variables

### 2. Configure Environment Variables

In Vercel Dashboard, add:
```
OPENROUTER_API_KEY=your_key
JWT_SECRET=secure_random_string
DATABASE_URL=your_supabase_postgres_url
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
FRONTEND_URL=https://your-domain.vercel.app
```

### 3. Deploy
```bash
vercel --prod
```

## Database Setup

### Option 1: Keep SQLite (Development Only)
- Works locally with `vercel dev`
- Won't work in production (serverless is stateless)

### Option 2: Migrate to Supabase (Recommended)
1. Create Supabase project
2. Get connection string
3. Update `DATABASE_URL` in Vercel
4. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

## Testing

### Test Locally
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test auth
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password"}'
```

### Test Production
Replace `localhost:3000` with your Vercel URL.

## Hybrid Deployment Option

If you want to keep the Express backend for now:

1. Deploy backend to Railway/Render
2. Deploy frontend to Vercel
3. Update `VITE_API_URL` to point to backend

This lets you test Vercel frontend hosting while keeping familiar Express backend.

## Troubleshooting

### "Module not found" errors
- Check import paths use relative imports
- Ensure `@/` alias is not used in API functions

### CORS errors
- Check `FRONTEND_URL` is set correctly
- Verify CORS headers in auth middleware

### Database connection issues
- Serverless functions create new connections
- Use connection pooling with Supabase
- Set reasonable connection limits

### File upload issues
- Serverless functions have limited tmp storage
- Use Supabase Storage for file uploads
- Stream large files directly to storage

## Next Steps

1. **Test all endpoints** with the new structure
2. **Update frontend** API calls if needed
3. **Set up Supabase** for production database
4. **Configure domain** in Vercel settings
5. **Enable analytics** in Vercel dashboard

## Rollback Plan

If issues arise, you can:
1. Keep using Express backend on Railway
2. Point frontend to Express API
3. Gradually migrate endpoints

The code is structured to support both approaches during transition.