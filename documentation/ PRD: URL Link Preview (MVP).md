# PRD: URL Link Preview (MVP)

**Feature Branch**: `URL_scraper`

---

## 1. Overview

This feature adds **automatic link previews** for URLs shared in chat. When a user shares a link, the system uses Reader to scrape basic metadata and display a preview card.

---

## 2. Goals

1. **Quick link previews**: Automatically display title, description, and favicon for shared URLs
2. **Background scraping**: Non-blocking scraping that doesn't impact chat performance
3. **Basic error handling**: Gracefully handle unscrapable links

---

## 3. Functional Requirements

1. **URL Detection**  
   - When a message of type `url` is saved to `shared_content`, trigger Reader scraping

2. **Scraping & Storage**  
   - Reader is called with the URL
   - On success, store in `shared_content.processed_data`:
     ```json
     {
       "metadata": {
         "title": "...",
         "description": "...",
         "favicon": "...",
         "domain": "..."
       }
     }
     ```
   - On failure, set `status = 'failed'`

3. **Preview Cards**  
   - Frontend displays a preview card with:
     - Title (linked to original URL)
     - Short description (first 140 chars)
     - Domain and favicon
   - Show loading state while scraping

---

## 4. Non-Functional Requirements

- **Performance**: Scraping happens asynchronously via background job
- **Security**: Only show previews to authorized room members
- **Fallbacks**: If scraping fails, show basic domain info

---

## 5. Workflow Outline

1. **User Shares URL**  
   - Create `shared_content` row: `content_type='url'`, `status='pending'`

2. **Background Scraping**  
   - Serverless function processes pending URLs via Reader
   - Updates `processed_data` and `status`

3. **Preview Display**  
   - Frontend shows metadata card when `status='scraped'`
   - Shows error state if `status='failed'`

---

## 6. Data Structures

### `shared_content` Table
- `content_type` (text)
- `content_url` (text)
- `processed_data` (jsonb)
- `status` (text)
- `last_scraped_at` (timestamp)

---

## 7. Implementation Steps

1. **Reader Integration**  
   - Background job for URL scraping
   - Metadata extraction and storage

2. **Preview Component**  
   - New React component for link cards
   - Loading/error states

3. **Error Handling**  
   - Retry mechanism for failed scrapes
   - Fallback UI for unscrapable links

---

## 8. Timeline

- **Week 1**: Implement scraping pipeline and metadata storage
- **Week 2**: Build preview UI components
- **Week 3**: Testing and deployment

---