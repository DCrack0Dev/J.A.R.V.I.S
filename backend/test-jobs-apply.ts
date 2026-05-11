import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { JobsService } from './src/jobs/jobs.service';
import { PrismaService } from './src/prisma.service';

async function test() {
  const prisma = new PrismaService();
  const service = new JobsService(prisma as any);
  
  console.log('Fetching a top scored job listing...');
  const job = await prisma.jobListing.findFirst({
    where: { matchScore: { not: null } },
    orderBy: { matchScore: 'desc' }
  });
  
  if (!job) {
    console.log('No scored jobs found. Please run scan and score-all first.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Testing application for: ${job.title} at ${job.company} (Score: ${job.matchScore})`);
  
  try {
    console.log('Generating cover letter...');
    const result = await service.generateCoverLetter(job.id);
    console.log('Cover letter generated successfully!');
    console.log('Sample content (first 200 chars):', result.coverLetter.substring(0, 200) + '...');

    console.log('Testing status update to "applied"...');
    const updated = await service.updateApplicationStatus(result.applicationId, 'applied', 'Submitted via website');
    console.log('Status update success:', updated.status === 'applied');
    console.log('AppliedAt set:', !!updated.appliedAt);

    console.log('Testing summary...');
    const summary = await service.getApplicationSummary();
    console.log('Application summary:', summary);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
