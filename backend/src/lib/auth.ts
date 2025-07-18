import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabase';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export async function verifyAuth(req: VercelRequest): Promise<AuthUser | null> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    // First try Supabase auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (user && !error) {
      return {
        id: user.id,
        email: user.email || '',
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
        role: user.user_metadata?.role || 'USER'
      };
    }

    // Fallback to JWT (for migration period)
    if (process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      return {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role || 'USER'
      };
    }

    return null;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthUser | null> {
  const user = await verifyAuth(req);
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  
  return user;
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthUser | null> {
  const user = await requireAuth(req, res);
  
  if (user && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  
  return user;
}

// Helper to set CORS headers
export function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}