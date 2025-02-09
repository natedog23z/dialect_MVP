# PRD: Full-Page Scraping & Extended AI Processing (with Firecrawl.dev)

## 1. Overview

### 1.1 Problem Statement

Our existing Reader provides only quick previews (basic metadata). Large or dynamic pages require full-text scraping to power advanced AI features (deep summarization, chunk-based Q&A, etc.).

### 1.2 Goal

Provide a user-initiated "deep analysis" trigger. Integrate with Firecrawl.dev for robust, on-demand full-page scraping (JavaScript rendering, multi-page crawling if needed). Store the scraped text in a dedicated table (`scraped_contents`) to facilitate advanced AI operations.


## 2. Functional Requirements

### Deeper Scraping Trigger

A user explicitly requests "Analyze This Link" or "Summarize in Detail." We do not deep-scrape automatically; the user must initiate to conserve resources.

### Scraping Execution

Use Firecrawl.dev for advanced scraping:

* Must handle JavaScript rendering and dynamic content.
* REST API call to POST `/scrape` with URL parameter.
* Returns content directly (no job polling required).
* Handles both text content and metadata extraction.

### Data Storage

New `scraped_contents` Table for large text (potentially split into multiple rows). Each row references the original `shared_content.id` (the link record). The `shared_content` table remains independent, managed by the Reader functionality.

### Status & Error Tracking

* Track scraping status in `scraped_contents` table:
  * `last_scraped_at` for timing
  * `error_message` for failures
  * `scrape_attempts` for retry tracking
* Keep Reader and scraping functionality separate

### Post-Scrape AI Processing

Once `scraped_contents` is populated, feed the text to the LLM (DeepSeek R1) for in-depth summarization, question-answer flows, etc.


## 3. Non-Functional Requirements

### Performance

The Firecrawl API handles content extraction and returns it directly. Our front-end calls a Next.js endpoint that processes the response in the background, allowing immediate user feedback while content is being stored.

### Scalability

Firecrawl's managed service handles the heavy lifting of content extraction. We focus on efficient storage and chunking of the returned content.

### Data Integrity

Keep large text in `scraped_contents`, separate from the Reader's preview data. Maintain references to `shared_content.id` while keeping the systems decoupled.

### Tool Compatibility

Firecrawl provides:
* Direct content extraction (no polling needed)
* Metadata extraction
* Error details for failed scrapes


## 4. Database Schema Changes

### 4.1 `scraped_contents` Table

```sql
CREATE TABLE scraped_contents (
  id BIGSERIAL PRIMARY KEY,
  shared_content_id BIGINT NOT NULL REFERENCES shared_content(id),
  chunk_index INT DEFAULT 0,       -- for large text broken into multiple rows
  text_content TEXT,               -- the actual scraped text for this chunk
  embedding VECTOR(1536),          -- using pgvector for semantic search
  meta_data JSONB,                -- metadata stored in first chunk only
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ,    -- timing of scrape attempt
  error_message TEXT,             -- any scraping errors
  scrape_attempts INT DEFAULT 0    -- track retry attempts
);

CREATE INDEX idx_scraped_contents_shared_content_id
    ON scraped_contents (shared_content_id);
```

### 4.2 Relationship with `shared_content`

The `shared_content` table remains focused on Reader functionality (quick previews). The `scraped_contents` table handles all deep scraping data independently.


## 5. Workflow Outline

### User Shares Link

1. Quick preview (Reader) populates `shared_content` with preview data
2. URL preview card shows "Summarize Link" button

### User Initiates Deep Scrape

1. User clicks "Summarize Link"
2. Next.js endpoint calls Firecrawl.dev via POST `/scrape`
3. Only the URL is required in the request body

### Scrape & Store

1. Receive content directly from Firecrawl
2. Extract both content and metadata
3. Split large content into chunks (100KB each)
4. Store in `scraped_contents`:
   - Content chunks with incremental index
   - Metadata in first chunk only
   - Track scraping timestamp and attempts

### Error Handling

1. If Firecrawl returns an error:
   - Create single row in `scraped_contents`
   - Store error message and timestamp
   - Track attempt count
2. Return error to UI for user feedback

### User Notification

While content is being processed, the UI can show appropriate loading states. On completion, either show success or error message.


## 6. Future Extensions

* **Semantic Search:** We may embed text (`embedding` column) for vector search.
* **Scheduling & Re-Scrapes:** Add periodic re-scraping with version tracking.
* **Auth/Headers:** Support for private pages via custom headers.
* **Multi-Page Crawls:** Potential expansion to handle site-wide content.


## 7. Acceptance Criteria

* **Schema:** `scraped_contents` table created with proper structure
* **UI:** "Summarize Link" button triggers scraping
* **Data Flow:** Content stored in chunks with metadata
* **Error Handling:** Failed scrapes properly recorded
* **Performance:** Background processing doesn't block UI


## 8. Conclusion

By integrating Firecrawl.dev and maintaining clear separation between Reader and scraping functionality, we've created a robust system for deep content analysis. The separation of concerns between `shared_content` and `scraped_contents` ensures each system can evolve independently while maintaining necessary relationships through foreign keys.


## 9. Implementation Progress

### 9.1 Database Schema ✅
- Created `scraped_contents` table with all fields
- Enabled pgvector extension
- Set up necessary indexes

### 9.2 API Integration ✅
- Implemented `/api/scrape/deep` endpoint
- Direct Firecrawl API integration
- Background content processing
- Proper error handling

### 9.3 Content Processing ✅
- 100KB chunk splitting
- Metadata extraction
- Error tracking
- Timestamp management

### Next Steps
1. Complete UI implementation
2. Add real-time updates
3. Implement AI processing
4. Add monitoring
