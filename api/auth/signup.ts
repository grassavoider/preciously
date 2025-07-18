import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { supabaseAdmin } from '../../backend/src/lib/supabase';
import { setCorsHeaders } from '../../backend/src/lib/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists in database
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Try Supabase Auth first (if configured)
    if (process.env.SUPABASE_URL) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username }
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        // Fall back to database-only auth
      } else if (authData.user) {
        // Create user in database with Supabase ID
        const user = await prisma.user.create({
          data: {
            id: authData.user.id,
            username,
            email,
            password: await bcrypt.hash(password, 10), // Still hash for compatibility
            role: 'USER'
          }
        });

        // Generate session token
        const { data: sessionData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${process.env.FRONTEND_URL}/auth/callback`
          }
        });

        return res.status(200).json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          token: sessionData?.properties?.hashed_token
        });
      }
    }

    // Fallback: Database-only auth
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER'
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}