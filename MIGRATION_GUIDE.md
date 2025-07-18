# Migration Guide: Express → Supabase + Vercel

## Current Architecture Issues

### 1. **Session-Based Authentication**
Currently using Express sessions stored in memory - this won't work with serverless.

**Current:**
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

**Needs to change to:**
```typescript
// Supabase Auth with JWT tokens
const { data: { user } } = await supabase.auth.getUser(token);
```

### 2. **Local File Storage**
Files stored on disk at `./uploads` - serverless functions can't persist files.

**Current:**
```typescript
const storage = multer.diskStorage({
  destination: './uploads/avatars',
  filename: (req, file, cb) => {...}
});
```

**Needs to change to:**
```typescript
// Supabase Storage
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(fileName, file.buffer);
```

### 3. **Monolithic Express Server**
Single Express app with all routes - Vercel needs individual serverless functions.

**Current structure:**
```
backend/
  src/
    index.ts (Express server)
    routes/
      characters.ts
      novels.ts
```

**Needs to change to:**
```
api/
  auth/
    signin.ts
    signup.ts
  characters/
    index.ts
    [id].ts
  novels/
    index.ts
    [id].ts
```

## Migration Strategy

### Option 1: Full Serverless Migration (Recommended)
Transform the entire backend into Vercel serverless functions.

**Pros:**
- Infinite scalability
- No server management
- Pay per use
- Integrated with Vercel frontend

**Cons:**
- Major refactoring required
- Cold start latency
- Different debugging experience

### Option 2: Hybrid Approach
Keep Express server on Railway/Render, use Supabase for auth/storage.

**Pros:**
- Minimal code changes
- Familiar Express patterns
- Easier migration

**Cons:**
- Two hosting providers
- Less integrated
- Server management required

### Option 3: Next.js API Routes
Migrate frontend to Next.js and use API routes.

**Pros:**
- Single deployment
- Full-stack framework
- Better SEO
- Type-safe API

**Cons:**
- Frontend rewrite required
- Learning curve
- Larger refactor

## Quick Wins for Current Architecture

If you want to deploy quickly without major changes:

### 1. **Add PostgreSQL Support**
```bash
# Update .env
DATABASE_URL="postgresql://[SUPABASE_CONNECTION_STRING]"

# Update Prisma schema
datasource db {
  provider = "postgresql"  // was "sqlite"
  url      = env("DATABASE_URL")
}

# Migrate
npx prisma migrate dev
```

### 2. **Add Supabase Storage Adapter**
```typescript
// backend/src/services/storage.ts
export class StorageService {
  async upload(file: Express.Multer.File, bucket: string) {
    if (process.env.SUPABASE_URL) {
      // Use Supabase Storage
      return await supabase.storage
        .from(bucket)
        .upload(file.filename, file.buffer);
    } else {
      // Fallback to local storage
      return { url: `/uploads/${bucket}/${file.filename}` };
    }
  }
}
```

### 3. **Deploy Backend to Railway**
Keep the Express server as-is but host on Railway:
- PostgreSQL from Supabase
- File storage from Supabase
- Express server on Railway
- Frontend on Vercel

## Recommended Path Forward

### For Quick Launch (1 week):
1. Keep Express backend architecture
2. Add Supabase for database only
3. Deploy backend to Railway ($5/month)
4. Deploy frontend to Vercel (free)
5. Add payments with Stripe

### For Long-term (1 month):
1. Migrate to Next.js 14 with App Router
2. Use Next.js API routes
3. Implement Supabase Auth
4. Use Supabase Storage
5. Deploy everything to Vercel

## Code Examples

### Serverless Function Example
```typescript
// api/characters/index.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('isPublic', true);
      
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ characters: data });
  }
  
  if (req.method === 'POST') {
    // Verify auth token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Create character
    const { data, error } = await supabase
      .from('characters')
      .insert({
        ...req.body,
        creatorId: user.id
      });
      
    return res.status(201).json(data);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
```

### Supabase Auth Middleware
```typescript
// lib/auth.ts
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<User | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return null;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  
  return user;
}
```

## Decision Matrix

| Approach | Development Time | Monthly Cost | Scalability | Complexity |
|----------|-----------------|--------------|-------------|------------|
| Current (Express + SQLite) | 0 days | $5-20 | Limited | Low |
| Express + Supabase | 2-3 days | $5-25 | Good | Low |
| Vercel Functions + Supabase | 1-2 weeks | $0-20 | Excellent | High |
| Next.js Full Stack | 3-4 weeks | $0-20 | Excellent | Medium |

## Recommendation

**For immediate launch:** Keep Express architecture, just swap SQLite for Supabase PostgreSQL and deploy to Railway.

**For best long-term results:** Migrate to Next.js with Supabase for a fully integrated, serverless solution.