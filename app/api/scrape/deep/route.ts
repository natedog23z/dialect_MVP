import { createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Firecrawl configuration
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL;
const FIRECRAWL_TIMEOUT_MS = parseInt(process.env.FIRECRAWL_TIMEOUT_MS || '120000');
const FIRECRAWL_POLL_INTERVAL_MS = parseInt(process.env.FIRECRAWL_POLL_INTERVAL_MS || '5000');

// Debug logging for configuration
console.log('[FIRECRAWL] Configuration check:');
console.log('[FIRECRAWL] API URL:', FIRECRAWL_API_URL);
console.log('[FIRECRAWL] API Key exists:', !!FIRECRAWL_API_KEY);
console.log('[FIRECRAWL] API Key prefix:', FIRECRAWL_API_KEY?.substring(0, 6));

// Validate configuration
if (!FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY is not configured');
}

if (!FIRECRAWL_API_URL) {
  throw new Error('FIRECRAWL_API_URL is not configured');
}

interface FirecrawlResponse {
  jobId: string;
  status: 'pending' | 'completed' | 'failed';
  result?: {
    content: string;
    metadata?: Record<string, any>;
  };
  error?: string;
}

async function startFirecrawlJob(url: string): Promise<FirecrawlResponse> {
  console.log('[FIRECRAWL] Starting job for URL:', url);
  console.log('[FIRECRAWL] Using API URL:', FIRECRAWL_API_URL);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
    'Accept': 'application/json'
  };

  // Start the job with correct request format
  const startResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      url
    })
  });

  // Log the response headers for debugging
  console.log('[FIRECRAWL] Response status:', startResponse.status);
  console.log('[FIRECRAWL] Response headers:', Object.fromEntries(startResponse.headers.entries()));

  if (!startResponse.ok) {
    console.error('[FIRECRAWL] API error:', startResponse.status, startResponse.statusText);
    // Try to get more error details from the response
    const errorText = await startResponse.text().catch(() => 'No error details available');
    console.error('[FIRECRAWL] Error details:', errorText);
    throw new Error(`Firecrawl API error: ${startResponse.status} ${startResponse.statusText} - ${errorText}`);
  }

  // Get the full response text first to ensure we get everything
  const rawText = await startResponse.text();
  console.log('[FIRECRAWL] Raw response length:', rawText.length);
  
  // Parse the JSON manually
  const responseData = JSON.parse(rawText);
  
  // Detailed logging of response structure and content
  console.log('[FIRECRAWL] Full response keys:', JSON.stringify(Object.keys(responseData), null, 2));
  console.log('[FIRECRAWL] Data object keys:', JSON.stringify(Object.keys(responseData.data || {}), null, 2));
  console.log('[FIRECRAWL] Markdown content length:', responseData.data?.markdown?.length || 0);
  console.log('[FIRECRAWL] First 100 chars:', responseData.data?.markdown?.substring(0, 100));
  console.log('[FIRECRAWL] Last 100 chars:', responseData.data?.markdown?.slice(-100));

  // Return in our expected format, with detailed logging
  const result: FirecrawlResponse = {
    jobId: 'direct',
    status: 'completed' as const,
    result: {
      content: responseData.data?.markdown || '',
      metadata: responseData.data?.metadata || {}
    }
  };

  if (result.result) {
    console.log('[FIRECRAWL] Final content length being returned:', result.result.content.length);
  } else {
    console.log('[FIRECRAWL] Warning: No content in result');
  }
  
  return result;
}

async function processScrapedContent(
  supabase: any,
  sharedContentId: number,
  content: string,
  metadata: Record<string, any> = {}
) {
  console.log('[PROCESS] Starting content processing for sharedContentId:', sharedContentId);
  console.log('[PROCESS] Original content length:', content.length, 'bytes');
  console.log('[PROCESS] Original content size:', Buffer.from(content).length / 1024, 'KB');
  console.log('[PROCESS] Metadata:', metadata);

  // For content under 100KB, store as single chunk
  if (Buffer.from(content).length < 100000) {
    console.log('[PROCESS] Content under 100KB, storing as single chunk');
    const { data, error } = await supabase
      .from('scraped_contents')
      .insert({
        shared_content_id: sharedContentId,
        chunk_index: 0,
        text_content: content,
        meta_data: metadata,
        last_scraped_at: new Date().toISOString(),
        scrape_attempts: 1
      })
      .select();

    if (error) {
      console.error('[PROCESS] Error inserting content:', error);
      throw error;
    }
    console.log('[PROCESS] Successfully inserted content with ID:', data?.[0]?.id);
    return;
  }

  // Only chunk if content is over 100KB
  const CHUNK_SIZE = 100000; // 100KB chunks
  const chunks = [];
  
  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    chunks.push(content.slice(i, i + CHUNK_SIZE));
  }
  
  // Validate total chunked content matches original
  const totalChunkedLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  console.log('[PROCESS] Original content length:', content.length);
  console.log('[PROCESS] Total chunked content length:', totalChunkedLength);
  console.log('[PROCESS] Split content into', chunks.length, 'chunks');
  
  if (totalChunkedLength !== content.length) {
    throw new Error(`Content length mismatch after chunking. Original: ${content.length}, Chunked: ${totalChunkedLength}`);
  }

  // Insert chunks into scraped_contents
  for (let i = 0; i < chunks.length; i++) {
    console.log('[PROCESS] Inserting chunk', i + 1, 'of', chunks.length, '(size:', chunks[i].length, 'bytes)');
    const { data, error } = await supabase
      .from('scraped_contents')
      .insert({
        shared_content_id: sharedContentId,
        chunk_index: i,
        text_content: chunks[i],
        meta_data: i === 0 ? metadata : null, // Store metadata only in first chunk
        last_scraped_at: new Date().toISOString(),
        scrape_attempts: 1
      })
      .select();

    if (error) {
      console.error('[PROCESS] Error inserting chunk:', error);
      // Update the chunk with error information
      await supabase
        .from('scraped_contents')
        .update({
          error_message: error.message,
          last_scraped_at: new Date().toISOString(),
          scrape_attempts: 1
        })
        .eq('shared_content_id', sharedContentId)
        .eq('chunk_index', i);
      throw error;
    }
    console.log('[PROCESS] Successfully inserted chunk', i + 1, 'with ID:', data?.[0]?.id);
  }

  console.log('[PROCESS] Successfully completed content processing');
}

export async function POST(request: Request) {
  try {
    const { url, sharedContentId } = await request.json();
    console.log('[ENDPOINT] Received request for URL:', url, 'sharedContentId:', sharedContentId);

    if (!url || !sharedContentId) {
      console.error('[ENDPOINT] Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Start the scraping job
    console.log('[ENDPOINT] Starting Firecrawl job');
    const firecrawlJob = await startFirecrawlJob(url);

    // Fire and forget - process in background
    (async () => {
      try {
        console.log('[BACKGROUND] Starting background processing');
        // Process the content
        if (firecrawlJob.result) {
          await processScrapedContent(
            supabase,
            sharedContentId,
            firecrawlJob.result.content,
            firecrawlJob.result.metadata
          );
          console.log('[BACKGROUND] Background processing completed successfully');
        } else {
          console.error('[BACKGROUND] No content in Firecrawl response');
          // Record the error in scraped_contents
          await supabase
            .from('scraped_contents')
            .insert({
              shared_content_id: sharedContentId,
              chunk_index: 0,
              error_message: 'No content in Firecrawl response',
              last_scraped_at: new Date().toISOString(),
              scrape_attempts: 1
            });
          throw new Error('No content in Firecrawl response');
        }
      } catch (error) {
        console.error('[BACKGROUND] Processing error:', error);
        // Record the error in scraped_contents if not already recorded
        await supabase
          .from('scraped_contents')
          .insert({
            shared_content_id: sharedContentId,
            chunk_index: 0,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            last_scraped_at: new Date().toISOString(),
            scrape_attempts: 1
          })
          .select();
      }
    })();

    // Return immediately with job started status
    console.log('[ENDPOINT] Returning success response');
    return NextResponse.json({
      success: true,
      message: 'Scraping job started',
      jobId: firecrawlJob.jobId,
    });

  } catch (error) {
    console.error('[ENDPOINT] Error in deep scrape endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to start scraping job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 