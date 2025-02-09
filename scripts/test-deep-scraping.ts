import { config } from 'dotenv';
import { resolve } from 'path';
import { runTest, TEST_CASES } from '../app/api/scrape/deep/test';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Ensure required environment variables are present
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'FIRECRAWL_API_KEY',
  'FIRECRAWL_API_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log('Starting Deep Scraping Tests...');

async function runAllTests() {
  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    const success = await runTest(testCase);
    if (success) passed++; else failed++;
  }

  console.log('\nTest Summary:');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${TEST_CASES.length}`);

  return passed === TEST_CASES.length;
}

runAllTests()
  .then((allPassed) => {
    console.log('Tests completed');
    process.exit(allPassed ? 0 : 1);
  })
  .catch((error: Error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  }); 