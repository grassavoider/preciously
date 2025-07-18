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
    const { username, password } = req.body;

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Try Supabase Auth first
    if (process.env.SUPABASE_URL && user.email) {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password
      });

      if (!error && data.session) {
        return res.status(200).json({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          token: data.session.access_token
        });
      }
    }

    // Fallback: Check password against database
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}