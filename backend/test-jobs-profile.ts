import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { JobsService } from './src/jobs/jobs.service';
import { PrismaService } from './src/prisma.service';

async function test() {
  const prisma = new PrismaService();
  const service = new JobsService(prisma as any);
  
  console.log('Testing manual profile setup...');
  const manualData = {
    name: 'Tebogo',
    email: 'tebogo@example.com',
    summary: 'Senior Developer with focus on AI and Cloud.',
    skills: ['NestJS', 'TypeScript', 'Prisma', 'OpenAI'],
    targetRoles: ['Senior Software Engineer', 'AI Engineer'],
    targetLocations: ['Remote', 'Cape Town'],
  };

  try {
    const profile = await service.upsertProfile(manualData);
    console.log('Manual profile setup success:', profile.name === 'Tebogo');

    console.log('Testing get profile...');
    const fetchedProfile = await service.getProfile();
    console.log('Get profile success:', fetchedProfile?.email === 'tebogo@example.com');

    console.log('Testing update profile...');
    const updateData = {
      phone: '+27 12 345 6789',
    };
    const updatedProfile = await service.updateProfile(updateData);
    console.log('Update profile success:', updatedProfile?.phone === '+27 12 345 6789');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
