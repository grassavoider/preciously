# Quick Start: Making Preciously.ai Production-Ready

## Minimum Viable Production Setup (1 Week)

This guide focuses on the absolute essentials to launch with paid subscriptions.

### Day 1-2: Database & Auth Migration

#### 1. Set up Supabase
```bash
# 1. Create account at https://supabase.com
# 2. Create new project
# 3. Get connection string and anon key
```

#### 2. Update Backend
```typescript
// backend/.env
DATABASE_URL="postgresql://[YOUR_SUPABASE_URL]"
SUPABASE_URL="https://[YOUR_PROJECT].supabase.co"
SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_KEY="[YOUR_SERVICE_KEY]"
```

#### 3. Migrate Schema
```bash
# Update Prisma schema for PostgreSQL
cd backend
npx prisma migrate dev --name init_postgres
```

### Day 3-4: Payments with Stripe

#### 1. Quick Stripe Setup
```bash
npm install stripe @stripe/stripe-js
```

#### 2. Create Price Tiers in Stripe Dashboard
- Free: $0 (handled in code)
- Pro: $9.99/month (price_xxxxx)
- Team: $29.99/month (price_xxxxx)

#### 3. Essential Payment Endpoints
```typescript
// backend/src/routes/billing.ts
POST /api/billing/create-checkout-session
POST /api/billing/create-portal-session
POST /api/billing/webhook (Stripe webhooks)
```

### Day 5: Image Storage

#### Option A: Supabase Storage (Easier)
```typescript
// Already included with Supabase!
const { data, error } = await supabase.storage
  .from('images')
  .upload(path, file)
```

#### Option B: Cloudinary (Better for AI images)
```typescript
// Free tier: 25GB storage, 25K transformations
npm install cloudinary
```

### Day 6-7: Deploy & Monitor

#### Deployment
```bash
# Frontend (Vercel)
vercel --prod

# Backend (Railway)
railway up
```

#### Essential Monitoring
```bash
# Sentry (free tier)
npm install @sentry/node @sentry/react
```

## Essential Code Snippets

### 1. Subscription Check Middleware
```typescript
// backend/src/middleware/checkSubscription.ts
export const requiresPro = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    include: { subscription: true }
  });
  
  if (!user?.subscription || user.subscription.status !== 'active') {
    return res.status(403).json({ 
      error: 'Pro subscription required',
      upgradeUrl: '/pricing'
    });
  }
  
  next();
};
```

### 2. Usage Tracking
```typescript
// backend/src/services/usage.ts
export async function trackUsage(userId: string, type: string) {
  const user = await getUserWithSubscription(userId);
  
  // Check limits for free users
  if (user.subscription?.tier === 'free') {
    const todayUsage = await prisma.usage.count({
      where: {
        userId,
        type,
        createdAt: { gte: startOfDay(new Date()) }
      }
    });
    
    const limits = {
      text_generation: 50,
      image_generation: 10,
      novel_creation: 3
    };
    
    if (todayUsage >= limits[type]) {
      throw new Error('Daily limit reached. Upgrade to Pro!');
    }
  }
  
  // Track the usage
  await prisma.usage.create({
    data: { userId, type }
  });
}
```

### 3. Simple Pricing Component
```tsx
// frontend/src/components/PricingCard.tsx
export function PricingCard({ tier, price, features, recommended }) {
  const handleUpgrade = async () => {
    const res = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ priceId: tier.stripePriceId })
    });
    
    const { url } = await res.json();
    window.location.href = url;
  };
  
  return (
    <Card className={recommended ? 'border-primary' : ''}>
      <CardHeader>
        <h3>{tier.name}</h3>
        <p className="text-2xl font-bold">${price}/mo</p>
      </CardHeader>
      <CardContent>
        <ul>
          {features.map(f => <li key={f}>✓ {f}</li>)}
        </ul>
        <Button onClick={handleUpgrade}>
          {tier.name === 'Free' ? 'Get Started' : 'Upgrade'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Environment Variables Checklist

```env
# Existing
OPENROUTER_API_KEY=xxx
ADMIN_USERNAME=username
ADMIN_PASSWORD=password

# New Production Variables
NODE_ENV=production
DATABASE_URL=postgresql://xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
CLOUDINARY_URL=cloudinary://xxx
FRONTEND_URL=https://preciously.ai
SESSION_SECRET=[generate-random-string]
```

## Pre-Launch Checklist

### Legal (Can use free generators)
- [ ] Terms of Service (use Termly.io)
- [ ] Privacy Policy (use Termly.io)
- [ ] Add to footer component

### Security
- [ ] Enable HTTPS (automatic with Vercel/Railway)
- [ ] Add rate limiting
```typescript
npm install express-rate-limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // limit each IP
});
```

### Essential Pages
- [ ] /pricing - Show tiers
- [ ] /dashboard - User's novels & usage
- [ ] /settings - Account & billing
- [ ] /terms & /privacy - Legal

### Testing
- [ ] Test free user limits work
- [ ] Test payment flow
- [ ] Test subscription webhooks
- [ ] Test image uploads

## Launch Day

1. **Deploy everything**
2. **Test payment flow with Stripe test mode**
3. **Switch Stripe to live mode**
4. **Update DNS to point to production**
5. **Monitor Sentry for errors**
6. **Watch user signups in Supabase**

## Post-Launch Priorities

1. **Week 1**: Fix any critical bugs
2. **Week 2**: Add email notifications
3. **Week 3**: Implement usage analytics
4. **Week 4**: Add social features

## Estimated Costs

### Month 1 (0-100 users)
- Supabase: $0 (free tier)
- Vercel: $0 (free tier)
- Railway: $5
- Domain: $15/year
- **Total: ~$5/month**

### Month 2-3 (100-1000 users)
- Supabase: $25
- Vercel: $20
- Railway: $20
- Cloudinary: $0-99
- **Total: ~$65-165/month**

### Break-even Point
- At $9.99/mo per Pro user
- Need ~17 Pro users to cover $165/mo costs
- Realistic target: 50 Pro users in 3 months = $500/mo revenue

## Resources

- [Supabase Quickstart](https://supabase.com/docs/guides/getting-started)
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Vercel Deployment](https://vercel.com/docs)
- [Railway Deployment](https://docs.railway.app/)