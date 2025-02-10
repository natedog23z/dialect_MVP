# PRD: In-Thread Processing Status Messages

**Status:** Implementation Complete - Ready for Review

## 1. Overview

Add visual feedback in chat threads when background processes (like AI summarization) are running. This will be accomplished by displaying an elegant system status message indicating the processing state.

## 2. Problem Statement

Users currently lack immediate feedback when requesting AI-powered features like link summarization. This can lead to uncertainty about whether their request was received and is being processed.

## 3. User Experience

### Message Flow ✅

1. User shares a URL in the thread.
2. User clicks "Summarize link" button.
3. Three sequential messages appear in thread:
    *  `Processing your request...` (system status message)
    *  `[Summarization Result]` (AI message - if successful)
    *  `[Error Message]` (system message - if failed)


### Visual Design ✅

System messages use:
* Gray/muted avatar with "S" for system
* Italic text for "Processing your request..."
* Subtle styling to differentiate from user/AI messages
* Loading animation (TODO: Refine animation)


## 4. Technical Requirements

### Database Changes ✅

The following changes have been implemented in migration `20250207165100_add_system_status_message.sql`:

```sql
-- Add new message type to enum
ALTER TABLE public.messages 
  ADD CONSTRAINT check_message_type 
  CHECK (message_type = ANY (ARRAY[
    'text'::text, 
    'audio'::text, 
    'system'::text, 
    'url'::text,
    'ai_response'::text,
    'system_status'::text
  ]));

-- Ensure system messages can be properly queried
CREATE INDEX idx_messages_system_status 
ON messages(message_type) 
WHERE message_type = 'system_status';
```

### Message Properties ✅

```typescript
interface SystemStatusMessage {
  id: string;
  content: string;
  message_type: 'system_status';
  created_at: string;
  user_id: string; // References SYSTEM_USER_ID
  room_id: string;
  thread_parent_id?: string;
}
```

### Required Environment Variables ✅

The following environment variables have been added to both projects:

```env
# In supabase-app/.env.local and ai-summarization-service/.env
SYSTEM_USER_ID=22222222-2222-4222-2222-222222222222
NEXT_PUBLIC_SYSTEM_USER_ID=22222222-2222-4222-2222-222222222222
```

### System User Setup ✅

A dedicated system user has been created with:
- UUID: 22222222-2222-4222-2222-222222222222
- Email: system-status@dialect.so
- Name: System Status
- Profile Type: system_ai

Note: This is a separate user from the Dialect AI user (11111111-1111-4111-1111-111111111111) to maintain clear separation of concerns between AI responses and system status messages.

### Row Level Security ✅

Added policy to allow system status messages:
```sql
CREATE POLICY "Allow system status to insert messages in any room"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid() = '22222222-2222-4222-2222-222222222222'::UUID)
        OR
        EXISTS (
            SELECT 1 FROM public.room_participants
            WHERE room_participants.room_id = messages.room_id
            AND room_participants.user_id = auth.uid()
        )
    );
```

## 5. Implementation

### Frontend Changes ✅

* Created new `SystemStatusMessage` component with:
  - Distinct visual styling
  - Loading animation support
  - Processing state management
* Updated `MessageList` component to:
  - Handle `system_status` message type
  - Track processing state
  - Support threaded messages
* Added processing state management:
  - Messages start in processing state
  - State is cleared when AI response arrives

### Backend Changes ✅

* System user creation implemented
* Modified summarization flow:
    ```typescript
    async function handleSummarizeRequest(url: string, messageId: string) {
      // 1. Insert user's "Summarize this link" message
      // 2. Insert system status message as thread reply
      // 3. Trigger existing summarization process
      // 4. AI response appears when complete
    }
    ```

## 6. Acceptance Criteria

### Must Have

* [x] System status message appears immediately after user request
* [x] System message has distinct visual styling (italic, muted)
* [x] System messages maintain correct threading
* [x] Solution works with existing summarization flow
* [x] Proper error handling if system message insertion fails

### Nice to Have

* [ ] Animated loading indicator (TODO: Refine animation)
* [x] System message updates when processing completes
* [ ] Ability to retry if process fails

## 7. Future Considerations

* Extend system messages for other async processes (thread summarization, file analysis)
* Add ability to show progress updates
* Consider timeout handling for long-running processes
* Add ability to cancel processing
* Refine loading animation for better user experience

## 8. Timeline

* ✅ Database & Infrastructure: 1 day
* ✅ Frontend Implementation: 2 days
* ✅ Backend Changes: 1 day
* Testing & QA: 1 day (In Progress)
* **Total: 5 days**

## 9. Success Metrics

* User feedback indicates clear understanding of processing state
* No increase in support tickets about "stuck" or "failed" summarization requests
* Maintain current performance metrics for message loading and thread rendering

## 10. Dependencies

* ✅ Database schema changes
* ✅ System user configuration
* ✅ Message threading system
* ✅ Supabase real-time capabilities
* ✅ AI summarization service integration
