import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // First check session
  if (req.session.userId) {
    return next();
  }
  
  // Then check JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.id || decoded.userId }
      });
      
      if (user) {
        req.session.userId = user.id;
        return next();
      }
    } catch (error) {
      console.error('JWT verification error:', error);
    }
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First ensure user is authenticated
  await requireAuth(req, res, async () => {
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
  });
};

export const isAuthenticated = requireAuth; // Alias for compatibility