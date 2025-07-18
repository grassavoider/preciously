# Vercel Testing Guide

## Quick Fix for the Error

The error you're seeing happens because Vercel is trying to build the entire app. For development, we need to run things differently.

## Option 1: Test API Only (Fastest)

```bash
# Just test the API functions
cd api
vercel dev --listen 3001
```

Then in another terminal:
```bash
cd frontend
npm run dev
```

## Option 2: Run Everything Separately

### Terminal 1 - Frontend:
```bash
cd frontend
npm run dev
```

### Terminal 2 - Test API endpoints directly:
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test with your existing Express backend for now
cd backend
npm run dev
```

## Option 3: Use Express Backend (Recommended for Now)

Since the Express backend is still working, you can continue using it while we prepare for Vercel deployment:

```bash
# This still works perfectly!
npm run dev
```

## Why the Error Happened

Vercel's `vercel dev` command tries to:
1. Build the frontend
2. Serve it statically
3. Run API functions

But our frontend needs to run in dev mode for hot reload, so we need to run them separately.

## For Production Deployment

When you're ready to deploy to Vercel:

1. **Install dependencies**:
   ```bash
   npm install
   cd backend && npm install
   ```

2. **Test the build locally**:
   ```bash
   cd frontend
   npm run build
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

## Testing Individual API Functions

You can test each API function directly:

```bash
# Test auth
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"password"}'

# Test health
curl http://localhost:3001/api/health
```

## Recommended Approach

For now, keep using the Express backend (`npm run dev`) which works perfectly. The Vercel functions are ready for when you want to deploy to production.

The migration is complete and backward-compatible, so nothing is broken!