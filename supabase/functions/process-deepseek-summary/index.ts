// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Types
interface ScrapedContent {
  id: string
  text_content: string
  ai_summary_status: 'pending' | 'in_progress' | 'completed' | 'failed'
  room_id: string
  shared_content_id: string
  user_id: string
}

interface ProcessingResult {
  success: boolean
  summary?: string
  error?: string
  token_count?: number
  duration_ms: number
}

interface AiUsageLog {
  room_id: string
  user_id: string
  llm_model: string
  query_text: string
  response_size: number
  token_count?: number
  estimated_cost?: number
  error?: string
  duration_ms: number
}

interface RequestPayload {
  record: ScrapedContent
}

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get('DB_URL') ?? ''
const supabaseServiceKey = Deno.env.get('DB_SERVICE_ROLE_KEY') ?? ''
const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY') ?? ''

if (!supabaseUrl || !supabaseServiceKey || !deepseekApiKey) {
  throw new Error('Missing required environment variables')
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function processWithDeepseek(text: string): Promise<{ summary: string, token_count: number }> {
  console.log('[DeepSeek] Starting API call with text length:', text.length)
  
  if (!deepseekApiKey) {
    console.error('[DeepSeek] API key not configured')
    throw new Error('DeepSeek API key not configured')
  }

  try {
    console.log('[DeepSeek] Making API request...')
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are DeepSeek R1, an expert summarizer. Your goal is to provide an accurate, concise, and easily understandable summary of the given webpage content. Focus on delivering the key points, relevant details, and any noteworthy insights in a neutral, clear tone. Assume the reader wants a quick yet comprehensive understanding without unnecessary fluff.

Instructions:
1. Start with a brief overview (1–2 sentences) capturing the central topic or purpose of the content.
2. Then, highlight the main ideas or sections—any important data, arguments, or actions mentioned.
3. Provide context where helpful, but avoid speculation. If something is unclear from the text, note it briefly rather than guessing.
4. End with a one-sentence "key takeaway" or conclusion, if relevant.
5. Keep the tone factual and balanced. Do not add personal opinions or external information not found in the text.

Formatting Guidelines:
- Write in paragraphs or concise bullet points (whichever best suits the content).
- Strive for clear, direct language (8th-grade reading level).
- Aim for a length of about 150–250 words (use your judgment—slightly longer if the content is very dense).

Output:
- Return only the summary text. No extra commentary, disclaimers, or explanation of your process.`
          },
          {
            role: 'user',
            content: `Below is the complete text of a webpage. Generate a summary following the instructions above.

---
${text}
---`
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
        top_p: 0.95,
        presence_penalty: 0.1
      })
    })

    if (!response.ok) {
      console.error('[DeepSeek] API error:', response.status, response.statusText)
      throw new Error(`DeepSeek API error: ${response.statusText}`)
    }

    console.log('[DeepSeek] Got response, parsing JSON...')
    const result = await response.json()
    console.log('[DeepSeek] Tokens used:', result.usage?.total_tokens)
    
    return {
      summary: result.choices[0].message.content,
      token_count: result.usage.total_tokens
    }
  } catch (error) {
    console.error('[DeepSeek] Error processing request:', error)
    throw error
  }
}

async function logAiUsage(
  content: ScrapedContent,
  result: ProcessingResult
): Promise<void> {
  console.log('[Logging] Starting AI usage logging...')
  
  const log: AiUsageLog = {
    room_id: content.room_id,
    user_id: content.user_id,
    llm_model: 'DeepSeek R1',
    query_text: content.text_content.substring(0, 1000),
    response_size: result.summary?.length ?? 0,
    token_count: result.token_count,
    error: result.error,
    duration_ms: result.duration_ms,
  }

  console.log('[Logging] Inserting log:', {
    room_id: log.room_id,
    user_id: log.user_id,
    token_count: log.token_count,
    duration_ms: log.duration_ms
  })

  const { error } = await supabase
    .from('ai_usage_logs')
    .insert(log)

  if (error) {
    console.error('[Logging] Failed to insert AI usage log:', error)
    throw error
  }
  
  console.log('[Logging] Successfully logged AI usage')
}

async function processWithTransaction(
  content: ScrapedContent
): Promise<ProcessingResult> {
  console.log('[Process] Starting content processing for id:', content.id)
  const startTime = Date.now()

  try {
    // 1. Update status to in_progress
    console.log('[Process] Updating status to in_progress...')
    const { error: updateError } = await supabase
      .from('scraped_contents')
      .update({ ai_summary_status: 'in_progress' })
      .eq('id', content.id)

    if (updateError) {
      console.error('[Process] Failed to update status:', updateError)
      throw updateError
    }

    // 2. Process with DeepSeek
    console.log('[Process] Calling DeepSeek API...')
    const { summary, token_count } = await processWithDeepseek(content.text_content)
    console.log('[Process] Got summary, length:', summary.length)

    // 3. Insert AI message
    const dialectAiUserId = Deno.env.get('DIALECT_AI_USER_ID')
    if (!dialectAiUserId) {
      console.error('[Process] Missing DIALECT_AI_USER_ID environment variable')
      throw new Error('Missing DIALECT_AI_USER_ID environment variable')
    }

    console.log('[Process] Inserting AI message...')
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: content.room_id,
        user_id: dialectAiUserId,
        content: summary,
        message_type: 'ai_response',
        shared_content_id: content.shared_content_id
      })

    if (messageError) {
      console.error('[Process] Failed to insert message:', messageError)
      throw messageError
    }

    // 4. Update final status
    console.log('[Process] Updating final status...')
    const { error: finalUpdateError } = await supabase
      .from('scraped_contents')
      .update({ 
        ai_summary_status: 'completed',
        summary_text: summary
      })
      .eq('id', content.id)

    if (finalUpdateError) {
      console.error('[Process] Failed to update final status:', finalUpdateError)
      throw finalUpdateError
    }

    console.log('[Process] Successfully completed processing')
    return {
      success: true,
      summary,
      token_count,
      duration_ms: Date.now() - startTime
    }

  } catch (error) {
    console.error('[Process] Error during processing:', error)

    // Update status to failed
    console.log('[Process] Updating status to failed...')
    await supabase
      .from('scraped_contents')
      .update({ 
        ai_summary_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', content.id)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    }
  }
}

serve(async (req: Request) => {
  console.log('[Edge] Function invoked')
  
  try {
    const payload = await req.json() as RequestPayload
    console.log('[Edge] Received payload for scraped_content_id:', payload.record?.id)
    
    // Input validation
    if (!payload.record || !payload.record.id || !payload.record.text_content) {
      console.error('[Edge] Invalid payload:', payload)
      throw new Error('Invalid input: missing required fields')
    }

    // Process content
    console.log('[Edge] Starting content processing...')
    const result = await processWithTransaction(payload.record)
    console.log('[Edge] Processing completed:', { success: result.success, error: result.error })

    // Log usage (blocking to ensure it completes)
    try {
      console.log('[Edge] Starting AI usage logging...')
      await logAiUsage(payload.record, result)
      console.log('[Edge] AI usage logging completed')
    } catch (error) {
      console.error('[Edge] Failed to log AI usage:', error)
      // Continue with response even if logging fails
    }

    console.log('[Edge] Sending response...')
    return new Response(
      JSON.stringify({ 
        success: result.success,
        summary: result.summary,
        error: result.error
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )

  } catch (error) {
    console.error('[Edge] Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-deepseek-summary' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
