import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Mock Prisma client for testing
export const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect after all tests
  await prisma.$disconnect();
});

// Helper to create test user
export async function createTestUser(email = 'test@nlmk.com') {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      phone: '+7 999 123 4567',
      bio: 'Test bio',
      position: 'Engineer',
      homeCity: 'Moscow',
      role: 'Both',
      prefMusic: 'Normal',
      prefSmoking: false,
      prefPets: false,
      prefBaggage: 'Medium',
      prefConversation: 'Chatty',
      prefAc: true,
      rating: 5.0,
    },
  });
}

// Helper to cleanup test data
export async function cleanupTestData() {
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.passengerRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: { startsWith: 'test' } } });
}
