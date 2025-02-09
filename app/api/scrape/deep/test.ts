import { createServiceRoleClient } from '../../../../utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Create a constant test user ID and email
const TEST_USER_ID = '00000000-0000-4000-a000-000000000000';
const TEST_USER_EMAIL = 'test@example.com';

interface TestCase {
  name: string;
  url: string;
  expectedStatus: 'scraped' | 'failed';
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Simple Static Page',
    url: 'https://example.com',
    expectedStatus: 'scraped',
    description: 'Should successfully scrape a simple static page'
  },
  {
    name: 'JavaScript-Heavy Page',
    url: 'https://react.dev',
    expectedStatus: 'scraped',
    description: 'Should handle JavaScript-rendered content'
  },
  {
    name: 'Non-existent Page',
    url: 'https://this-domain-should-not-exist-123xyz.com',
    expectedStatus: 'failed',
    description: 'Should handle non-existent domains gracefully'
  }
];

async function createTestUser(supabase: any) {
  // Check if test user exists in auth.users
  const { data: existingUser, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', TEST_USER_ID)
    .maybeSingle();

  if (existingUser) {
    return existingUser;
  }

  // Create test user in auth.users
  const { error: createError } = await supabase.rpc('create_test_user', {
    user_id: TEST_USER_ID,
    email: TEST_USER_EMAIL
  });

  if (createError) throw createError;

  // Wait a moment for the trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { id: TEST_USER_ID };
}

async function createTestMessage(supabase: any, url: string) {
  // First ensure test user exists
  await createTestUser(supabase);

  // First create or get a test room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('name', 'Test Room')
    .maybeSingle();

  let roomId;
  if (!room) {
    const { data: newRoom, error: newRoomError } = await supabase
      .from('rooms')
      .insert({
        name: 'Test Room',
        creator_id: TEST_USER_ID,
        max_participants: 12
      })
      .select()
      .single();
    
    if (newRoomError) throw newRoomError;
    roomId = newRoom.id;
  } else {
    roomId = room.id;
  }

  // Create a test message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      user_id: TEST_USER_ID,
      content: `Test message for ${url}`,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (messageError) throw messageError;
  return message;
}

async function createTestSharedContent(supabase: any, url: string) {
  // First check if we already have this URL
  const { data: existing } = await supabase
    .from('shared_content')
    .select('id')
    .eq('content_url', url)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create a test message first
  const message = await createTestMessage(supabase, url);

  // Create new shared_content entry
  const { data, error } = await supabase
    .from('shared_content')
    .insert({
      message_id: message.id,
      content_url: url,
      content_type: 'url',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function waitForScrapeCompletion(supabase: any, sharedContentId: number, timeoutMs = 180000): Promise<string> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const { data: scrapeData, error: scrapeError } = await supabase
      .from('scraped_contents')
      .select('text_content')
      .eq('shared_content_id', sharedContentId)
      .maybeSingle();

    if (scrapeError) throw scrapeError;

    if (scrapeData) {
      return 'scraped';
    }

    // Check if we have a failed scrape attempt
    const { data: contentData, error: contentError } = await supabase
      .from('scraped_contents')
      .select('error_message')
      .eq('shared_content_id', sharedContentId)
      .gt('scrape_attempts', 0)
      .maybeSingle();

    if (contentError) throw contentError;

    if (contentData?.error_message) {
      return 'failed';
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Timeout waiting for scrape completion');
}

async function verifyScrapedContent(supabase: any, sharedContentId: number) {
  const { data, error } = await supabase
    .from('scraped_contents')
    .select('*')
    .eq('shared_content_id', sharedContentId)
    .order('chunk_index');

  if (error) throw error;

  // Verify we have content
  if (!data || data.length === 0) {
    throw new Error('No scraped content found');
  }

  // Verify first chunk has metadata
  if (!data[0].meta_data) {
    throw new Error('First chunk missing metadata');
  }

  return data;
}

async function runTest(testCase: TestCase) {
  console.log(`\nRunning test: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  
  const supabase = createServiceRoleClient();
  
  try {
    // Create test shared_content record
    console.log('Creating shared_content record...');
    const sharedContent = await createTestSharedContent(supabase, testCase.url);
    
    // Call the deep scrape endpoint
    console.log('Calling deep scrape endpoint...');
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scrape/deep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testCase.url,
        sharedContentId: sharedContent.id
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    // Wait for completion
    console.log('Waiting for scrape completion...');
    const finalStatus = await waitForScrapeCompletion(supabase, sharedContent.id);
    
    // Verify status matches expected
    if (finalStatus !== testCase.expectedStatus) {
      throw new Error(`Expected status ${testCase.expectedStatus} but got ${finalStatus}`);
    }

    // If expected to succeed, verify content
    if (testCase.expectedStatus === 'scraped') {
      console.log('Verifying scraped content...');
      const scrapedContent = await verifyScrapedContent(supabase, sharedContent.id);
      console.log(`Found ${scrapedContent.length} content chunks`);
    }

    console.log(`✅ Test passed: ${testCase.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${testCase.name}`);
    console.error(error);
    return false;
  }
}

async function cleanupTestData(supabase: any) {
  console.log('\nCleaning up test data...');
  
  // Delete test scraped contents
  await supabase
    .from('scraped_contents')
    .delete()
    .eq('meta_data->test', true);

  // Delete test shared content
  await supabase
    .from('shared_content')
    .delete()
    .eq('content_url', 'https://example.com')
    .or('content_url.eq.https://react.dev,content_url.eq.https://this-domain-should-not-exist-123xyz.com');

  // Delete test messages
  await supabase
    .from('messages')
    .delete()
    .like('content', 'Test message for %');

  // Delete test room
  await supabase
    .from('rooms')
    .delete()
    .eq('name', 'Test Room');

  console.log('Cleanup complete');
}

async function runAllTests() {
  console.log('Starting deep scraping tests...');
  
  const supabase = createServiceRoleClient();
  let passed = 0;
  let failed = 0;

  try {
    for (const testCase of TEST_CASES) {
      const success = await runTest(testCase);
      if (success) passed++; else failed++;
    }
  } finally {
    // Always try to clean up, even if tests fail
    await cleanupTestData(supabase);
  }

  console.log('\nTest Summary:');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${TEST_CASES.length}`);

  return passed === TEST_CASES.length;
}

// Only run if called directly (not imported)
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runTest, TEST_CASES }; 