import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('Creating test users...');

    // Create free tier user
    const freePassword = await bcrypt.hash('freeuser123', 10);
    const freeUser = await prisma.user.upsert({
      where: { username: 'freeuser' },
      update: {},
      create: {
        username: 'freeuser',
        email: 'freeuser@preciously.ai',
        password: freePassword,
        role: 'USER',
        tier: 'FREE'
      }
    });
    console.log('Created free tier user:', freeUser.username);

    // Create paid tier user
    const paidPassword = await bcrypt.hash('paiduser123', 10);
    const paidUser = await prisma.user.upsert({
      where: { username: 'paiduser' },
      update: {},
      create: {
        username: 'paiduser',
        email: 'paiduser@preciously.ai',
        password: paidPassword,
        role: 'USER',
        tier: 'PAID'
      }
    });
    console.log('Created paid tier user:', paidUser.username);

    console.log('\nTest users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Free tier user:');
    console.log('  Username: freeuser');
    console.log('  Password: freeuser123');
    console.log('\nPaid tier user:');
    console.log('  Username: paiduser');
    console.log('  Password: paiduser123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();