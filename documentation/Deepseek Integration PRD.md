# PRD: DeepSeek Integration for Link Summaries

This document outlines the **DeepSeek R1 integration** that automates link summarization once **Firecrawl** successfully scrapes webpage content. It builds on the existing flow: user shares link → quick preview → user clicks "Summarize Link" → Firecrawl stores data in `scraped_contents`. We now add the AI logic to generate and post the summary in real time.

---

## 1. Overview

### 1.1 Background
- Users can share links in Dialect.  
- **Reader** fetches basic metadata for a quick preview card.  
- If a user wants a full summary, they click "Summarize Link," which triggers **Firecrawl** to get the full text, storing it in `scraped_contents`.  

### 1.2 Gap
- Currently, after scraping finishes, there is **no** automated step that:
  - Invokes **DeepSeek R1** with the scraped text.  
  - Posts the AI's response as a standard message in the chat thread.
  - Tracks the AI processing state in a reliable way.

### 1.3 Goal
- As soon as `scraped_contents` is updated with the full text, automatically call DeepSeek R1 with a **predefined summarization prompt**.  
- Store AI responses as standard messages for seamless chat integration.
- Track AI processing state using `ai_summary_status` column.
- Display real-time status updates in the UI based on the processing state.

---

## 2. Functional Requirements

1. **Automatic Summarization Trigger**  
   - When a new row is added to `scraped_contents` (or updated from partial to complete text), the system triggers DeepSeek R1.  
   - A serverless function or background job can poll or listen for the insertion event.
   - The `ai_summary_status` column tracks the state: 'pending' → 'in_progress' → 'completed'/'failed'.

2. **Prompt Construction**  
   - Use the **system prompt** that sets DeepSeek's role as a clear, neutral summarizer.  
   - Inject the full scraped text (`scraped_contents.text_content`) as the user prompt.

3. **Real-time Status Updates**  
   - The UI subscribes to changes in `ai_summary_status` using Supabase Realtime.
   - Status indicators in the chat UI:
     - When `ai_summary_status = 'pending'`: Show "Summarize Link" button
     - When `ai_summary_status = 'in_progress'`: Show "Dialect AI is summarizing..." with spinner
     - When `ai_summary_status = 'completed'`: Show the summary
     - When `ai_summary_status = 'failed'`: Show error message with retry option

4. **AI Responses as Standard Messages**  
   - When the AI response is ready (`ai_summary_status = 'completed'`), create a standard message:
     ```sql
     INSERT INTO messages (
       room_id,
       user_id,     -- Set to DIALECT_AI_USER_ID (special system user)
       content,     -- The AI-generated summary
       message_type -- 'ai_response'
     )
     ```
   - Benefits:
     - All participants see AI responses in the same feed as human messages
     - Naturally supports future AI capabilities (summaries, steel-manning, etc.)
     - Leverages existing message threading and UI components
     - Maintains conversation context and flow

5. **Error Handling**  
   - If DeepSeek fails or times out, post a short error message (e.g., "AI summarization failed. Please retry.").

6. **Logs & Usage Tracking**  
   - Record each summarization call in `ai_usage_logs` with details like `room_id`, `shared_content_id`, `llm_model` ("DeepSeek R1"), and `response_size`.

---

## 3. Workflow Outline

1. **User Clicks "Summarize Link"**  
   - The chat client posts a message: "UserX: Summarize this link."  
   - Firecrawl is invoked in the background.
   - `ai_summary_status` remains 'pending'.

2. **Scraping Completes**  
   - Firecrawl returns full text.  
   - A new row is inserted into `scraped_contents` with `shared_content_id = X`.

3. **Trigger DeepSeek**  
   - On insert, a function detects that `scraped_contents` is ready.
   - Updates `ai_summary_status` to 'in_progress'.
   - UI automatically updates to show "Dialect AI is summarizing..." based on the status change.

4. **AI Summarization**  
   - The system constructs the prompt and sends it to DeepSeek R1.
   - If any error occurs, sets `ai_summary_status = 'failed'`.
   - UI shows appropriate error message based on status.

5. **Post Summary**  
   - Once summary is received, sets `ai_summary_status = 'completed'`.
   - Creates a new **Dialect AI** message in the same thread.
   - Updates logs in `ai_usage_logs`.

6. **User Sees the Result**  
   - Chat UI refreshes with the new message.  
   - The user can read or further engage with the summary.

---

## 4. Non-Functional Requirements

1. **Latency**  
   - Target <5–10 seconds for average link summarization. (Longer for big pages is acceptable, but the UI should show a progress indicator.)

2. **Reliability**  
   - Handle intermittent AI or scraper failures gracefully, with a retry or a clear error message.

3. **Privacy**  
   - Summaries and requests must only be visible to users in the same room/thread. Ensure row-level security is applied.

4. **Scalability**  
   - If multiple users request summarization at once, the system should queue or parallelize responsibly.

---

## 5. Implementation Notes

- **Message Integration**
  - Create a special system user "Dialect AI" with a reserved `user_id`
  - Add 'ai_response' to the `message_type` enum in `messages` table
  - AI responses appear in the chat feed like any other message
  - Existing message UI components handle display automatically
- **Status Tracking**
  - The `ai_summary_status` column in `scraped_contents` tracks processing state
  - Values: 'pending' (default), 'in_progress', 'completed', 'failed'
  - An index on this column ensures efficient status queries
- **Real-time Updates**
  - Frontend already subscribes to new messages via Realtime
  - Additional subscription to `scraped_contents` for processing status
- **Error Recovery**
  - If status is 'failed', show a retry button that resets status to 'pending'
  - Error messages appear as system messages in the chat
- **Trigger Mechanism**  
  - Option A: **DB Trigger** on `scraped_contents` insert. Use a **Supabase Edge Function** to call DeepSeek.  
  - Option B: A **background worker** that listens for new inserts via Realtime, then calls DeepSeek.  
- **Prompt Storage**  
  - The system prompt can be stored as a constant in code or an environment variable for easy updates.

---

## 6. Acceptance Criteria

1. **Full Flow**  
   - **User shares link**  
   - **Quick preview card** is shown; user sees a "Summarize Link" button.  
   - **User clicks** the button, prompting a "Scrape + Summarize."  
   - Firecrawl completes the scrape and writes to `scraped_contents`.

2. **Automatic AI Summarization**  
   - The system detects the new `scraped_contents` row and **calls DeepSeek** with the entire text.  
   - A "thinking" state or placeholder message appears in the thread.

3. **AI Response**  
   - A new "Dialect AI" message posts the **summarized text** in the same thread.  
   - The user reads the summary in real time.

4. **Error Handling**  
   - If DeepSeek times out or fails, the system posts a short error message in the thread.

5. **Logging**  
   - Each summarization is recorded in `ai_usage_logs`.

---

## 7. Implementation Progress

### 7.1 Database Schema Updates ✅
- Added `profile_type` column to `profiles`:
  ```sql
  ALTER TABLE public.profiles
  ADD COLUMN profile_type text NOT NULL DEFAULT 'human'
  CHECK (profile_type IN ('human','system_ai','other'));
  ```
- Created index for efficient status queries:
  ```sql
  CREATE INDEX idx_scraped_contents_ai_summary_status 
    ON scraped_contents(ai_summary_status);
  ```
- Added 'ai_response' message type to `messages` table

### 7.2 System User Creation ✅
- Created Dialect AI system user with UUID: `11111111-1111-4111-1111-111111111111`
- Set up entries in both `auth.users` and `public.profiles`
- Configured with profile_type = 'system_ai'

### 7.3 RLS Policies ✅
- Added policies for AI system to read and write messages:
  ```sql
  CREATE POLICY "Allow system AI to read any room content"
    ON public.messages FOR SELECT TO authenticated
    USING ((SELECT profile_type FROM public.profiles WHERE id = auth.uid()) = 'system_ai' OR EXISTS (...));

  CREATE POLICY "Allow system AI to insert messages in any room"
    ON public.messages FOR INSERT TO authenticated
    WITH CHECK ((SELECT profile_type FROM public.profiles WHERE id = auth.uid()) = 'system_ai' OR EXISTS (...));
  ```
- Added policy for AI to read scraped contents:
  ```sql
  CREATE POLICY "Allow system AI to read scraped contents"
    ON public.scraped_contents FOR SELECT TO authenticated
    USING ((SELECT profile_type FROM public.profiles WHERE id = auth.uid()) = 'system_ai' OR EXISTS (...));
  ```

### 7.4 Next Steps

1. **Edge Function Implementation** ⏳
   - ✅ Created Edge Function structure with TypeScript interfaces
   - ✅ Set up error handling, logging, and transaction safety
   - ✅ Implemented database operations and status updates
   - ✅ Deployed initial function structure to Supabase
   - ✅ Set up `DIALECT_AI_USER_ID` environment variable
   - 🛑 BLOCKED: Waiting for DeepSeek API access
     - Need DeepSeek API key when website is back online
     - Will need to test API integration once key is available
   - Next steps after getting API key:
     ```bash
     # 1. Set API key in Supabase
     supabase secrets set DEEPSEEK_API_KEY=<your-key>
     
     # 2. Test the integration
     # 3. Monitor initial summarizations
     ```

2. **Real-time Status Updates** ⏳
   - Frontend subscription setup pending:
     ```typescript
     supabase
       .from('scraped_contents')
       .on('UPDATE', payload => {
         // Status handling
       })
     ```
   - Need to implement loading states
   - Need to add error handling in UI

3. **Message Creation Logic** ✅
   - Implemented message creation using Dialect AI system user
   - Set up proper threading for AI responses
   - Added error case handling and retries
   - Transaction-safe message insertion

4. **Testing and Monitoring** ⏳
   - Need to create test suite for AI summarization flow
   - Need to set up monitoring for API usage and failures
   - Need to add error reporting and alerting

5. **Documentation** ⏳
   - Need to document Edge Function usage
   - Need to add examples for common use cases
   - Need to update API documentation with new endpoints

### 7.6 Current Status

1. **Completed**
   - Edge Function structure and deployment
   - Database schema and RLS policies
   - Message creation logic
   - Error handling and logging setup
   - Basic environment variable configuration

2. **Blocked**
   - DeepSeek API integration (waiting for API access)
   - Live testing of summarization

3. **Ready for Next Session**
   - Once DeepSeek API key is available:
     1. Add API key to environment variables
     2. Test full summarization flow
     3. Monitor initial usage and errors
   - Alternative next steps (while waiting for API):
     1. Implement frontend status updates
     2. Set up testing infrastructure
     3. Work on documentation

4. **Environment Setup Done**
   ```bash
   # Already configured:
   SUPABASE_URL=<configured>
   SUPABASE_SERVICE_ROLE_KEY=<configured>
   DIALECT_AI_USER_ID=11111111-1111-4111-1111-111111111111

   # Pending:
   DEEPSEEK_API_KEY=<waiting for access>
   ```

### 7.7 Implementation Update (Feb 5, 2025)

1. **Database Trigger Implementation** ✅
   - Implemented robust database trigger for automatic DeepSeek processing:
   ```sql
   CREATE TRIGGER deepseek_summary_trigger
     BEFORE INSERT OR UPDATE OF text_content, ai_summary_status
     ON public.scraped_contents
     FOR EACH ROW
     EXECUTE FUNCTION invoke_deepseek_summary();
   ```
   
2. **Concurrency & Error Handling** ✅
   - Added advisory locks to prevent duplicate processing:
   ```sql
   IF NOT pg_try_advisory_xact_lock(NEW.id) THEN
     RAISE LOG 'Could not acquire lock for scraped_content_id: %';
     RETURN NEW;
   END IF;
   ```
   - Implemented row-level locking with `FOR UPDATE`
   - Added comprehensive error logging and status tracking

3. **Trigger Conditions** ✅
   - Precise control over when processing occurs:
     - New content with 'pending' status
     - Status changes TO 'pending'
     - Text content changes while status is 'pending'
   - Prevents duplicate processing and infinite loops

4. **Environment Configuration** ✅
   - Set up DeepSeek API key in Supabase secrets:
   ```bash
   supabase secrets set DEEPSEEK_API_KEY="sk-255ff2cd6ffc4c798108cd89f77d5b65"
   ```
   - Configured service role authentication
   - Set up local vs production URLs

5. **System Prompt** ✅
   - Implemented detailed system prompt for DeepSeek:
     - Clear instructions for summarization
     - Formatting guidelines
     - Output requirements
     - Length and style specifications

6. **Status Updates & Messaging** ✅
   - Added real-time status messages in chat:
     - "Processing link summary..." when started
     - Error messages if processing fails
   - Proper error propagation to UI

7. **Next Steps**
   - Monitor initial usage and performance
   - Add retry mechanism for failed summaries
   - Implement rate limiting if needed
   - Add more detailed logging for production monitoring

### 7.8 Implementation Progress (Feb 5, 2025 - Afternoon Update)

1. **Message Threading Structure** ✅
   - Implemented correct thread panel structure:
     ```
     Main Chat:
     - URL message + preview card
     
     Thread Panel (when summarize clicked):
     1. Original URL message
     2. "Summarize this link" message
     3. "Processing link summary..." message (Dialect AI)
     4. Final summary message (Dialect AI)
     ```

2. **Trigger Development Status** 🔄
   - Initial version: Trigger fired but messages were out of order
   - Current version: Fixed message ordering but trigger stopped firing
   - Latest changes:
     ```sql
     CREATE TRIGGER deepseek_summary_trigger
       AFTER INSERT OR UPDATE
       ON public.scraped_contents
       FOR EACH ROW
       EXECUTE FUNCTION invoke_deepseek_summary();
     ```

3. **Known Issues**
   a. **Message Ordering** ✅
      - Fixed by using `thread_parent_id` consistently
      - All messages now thread under original URL message
   
   b. **Trigger Firing** 🛑
      - Previously: Trigger fired but had wrong message order
      - Currently: Trigger not firing after fixing order
      - Added debug logging but logs not appearing
      ```sql
      RAISE LOG 'DeepSeek trigger starting for operation: %, scraped_content_id: %, status: %', 
                TG_OP, NEW.id, NEW.ai_summary_status;
      ```

4. **Next Debugging Steps**
   a. **Verify Trigger Installation**
      ```sql
      -- Run this to check if trigger exists
      SELECT * FROM pg_trigger WHERE tgname = 'deepseek_summary_trigger';
      
      -- Check trigger function
      SELECT prosrc FROM pg_proc WHERE proname = 'invoke_deepseek_summary';
      ```
   
   b. **Check Initial Row State**
      ```sql
      -- When debugging, check the initial insert
      SELECT * FROM scraped_contents ORDER BY id DESC LIMIT 1;
      ```
   
   c. **Debug Points to Check**
      1. Is the initial insert setting `ai_summary_status = 'pending'`?
      2. Are we correctly identifying the URL message and its thread?
      3. Is pg_net extension enabled and working?
      4. Are environment variables (service role key) set correctly?

5. **Rollback Point**
   - Consider reverting to the version where trigger fired but messages were out of order
   - Then fix message ordering without changing trigger conditions
   - Key files to check:
     ```
     /supabase/migrations/20250205040000_add_deepseek_trigger.sql
     /supabase/functions/process-deepseek-summary/index.ts
     ```

6. **Environment Setup**
   ```bash
   # Required environment variables
   SUPABASE_URL=<configured>
   SUPABASE_SERVICE_ROLE_KEY=<configured>
   DIALECT_AI_USER_ID=11111111-1111-4111-1111-111111111111
   DEEPSEEK_API_KEY=<configured>
   ```

7. **Testing Steps**
   1. Share URL in main chat
   2. Wait for preview card
   3. Click "✨ Summarize link"
   4. Check logs for:
      - Trigger firing logs
      - Status updates
      - Edge function calls
   5. Verify thread panel shows messages in order

8. **Next Session Tasks**
   1. Enable detailed logging in Supabase dashboard
   2. Check trigger existence and configuration
   3. Consider simplifying trigger conditions temporarily
   4. Test each component independently:
      - URL sharing
      - Scraping
      - Trigger firing
      - Edge function
   5. Add more logging points in trigger function

### 7.9 Implementation Progress (Feb 6, 2025)

1. **Database Schema Updates** ✅
   - Added missing columns to `ai_usage_logs` table:
     ```sql
     ALTER TABLE public.ai_usage_logs
     ADD COLUMN IF NOT EXISTS duration_ms integer,
     ADD COLUMN IF NOT EXISTS token_count integer,
     ADD COLUMN IF NOT EXISTS error text;
     ```
   - Added `shared_content_id` to messages table:
     ```sql
     ALTER TABLE public.messages
     ADD COLUMN IF NOT EXISTS shared_content_id bigint REFERENCES public.shared_content(id);
     CREATE INDEX IF NOT EXISTS messages_shared_content_id_idx ON public.messages(shared_content_id);
     ```

2. **Environment Variable Updates** ✅
   - Renamed environment variables to avoid Supabase Edge Function restrictions:
     - `SUPABASE_URL` → `DB_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` → `DB_SERVICE_ROLE_KEY`
   - Retained other variables:
     - `DEEPSEEK_API_KEY`
     - `DIALECT_AI_USER_ID`

3. **Current Issues** 🛑
   - Foreign key constraint errors when testing:
     1. First error: `Key (room_id)=(1) is not present in table "rooms"`
     2. Second error: `Key (shared_content_id)=(1) is not present in table "shared_content"`
   - Connection errors when testing locally:
     ```
     TypeError: error sending request for url (http://127.0.0.1:54321/rest/v1/scraped_contents?id=eq.1)
     ```
   - Need to ensure proper data exists in related tables before testing:
     1. Create test room
     2. Create shared_content record
     3. Create scraped_content record

4. **Next Steps**
   a. **Data Setup**
      - Create necessary test data in all required tables
      - Verify foreign key relationships
   
   b. **Local Testing**
      - Ensure local Supabase instance is running
      - Verify database connectivity
      - Test with complete data chain

   c. **Error Handling**
      - Add better validation for foreign key relationships
      - Improve error messages
      - Add retry logic for failed connections

5. **Environment Configuration**
   ```bash
   # Current environment variables
   DB_URL=http://127.0.0.1:54321
   DB_SERVICE_ROLE_KEY=<configured>
   DEEPSEEK_API_KEY=sk-255ff2cd6ffc4c798108cd89f77d5b65
   DIALECT_AI_USER_ID=11111111-1111-4111-1111-111111111111
   ```

---

## 8. Conclusion

This **DeepSeek Integration** PRD completes the **link summary flow** by automatically summarizing fully scraped content once `scraped_contents` is ready. It ensures the user sees immediate feedback ("Dialect AI is thinking...") and receives a **concise, helpful** summary in the thread—closing the loop from link preview to thorough AI analysis.