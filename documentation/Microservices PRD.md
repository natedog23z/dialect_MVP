# Product Requirements Document (PRD)

**Feature Name:** AI URL Summarization Microservice ("Dialect AI")

## Overview

This feature adds an AI-assisted URL summarization capability to the existing group chat application. When a user shares a URL in the chat, Firecrawl.dev already scrapes the content and stores it in the `scraped_contents` table (in the `text_content` column). The new microservice will monitor for new or updated scraped content, call DeepSeek R1 to generate a summary, and then post the resulting summary back into the group chat. The summary will appear as a message from the AI persona "Dialect AI" in the `messages` table.

**Tech Stack:**

* **Backend Microservice:** Node.js with Express
* **Deployment Platform:** Render
* **AI Summarization API:** DeepSeek R1 (invoked via an OpenAI-compatible API endpoint)
* **Database:** Supabase (used for the group chat's `messages` and `scraped_contents` tables)


## Objectives & Goals

**Objective:** Provide users with concise, AI-generated summaries of shared URLs to enhance collaboration and discussion within the group chat.

**Goals:**

* Trigger summarization when a URL's scraped content is ready.
* Generate a summary using DeepSeek R1.
* Post the summary into the group chat as if sent by "Dialect AI."
* Keep the microservice decoupled from the main chat application to ensure reliability and maintainability.


## Stakeholders

* **Product Manager:** Oversees feature rollout and gathers user feedback.
* **Backend Developers:** Build and maintain the Node.js summarization microservice.
* **DevOps/Infrastructure Team:** Deploys and monitors the service on Render.
* **End Users:** Group chat participants who benefit from enhanced conversation through summarized content.
* **AI/Data Team:** Configures and optimizes the DeepSeek R1 API integration.


## User Stories

* As a chat user, when I see a "Summarize" button next to a shared URL, I want the system to generate a brief summary so I can quickly understand the content.
* As a chat user, I want the summary to appear in the chat under the name "Dialect AI" so that it feels like a natural part of the conversation.
* As a developer, I need the microservice to be independent of the main chat logic so that issues with summarization do not impact real-time messaging.


## Functional Requirements

### Trigger & Input

* **FR1:** When a user clicks the "Summarize" button next to a shared URL, the frontend will mark the associated record in the `scraped_contents` table as ready for summarization.
* **FR2:** The microservice will be triggered by an event (via Supabase realtime subscriptions or polling) indicating that `scraped_contents.text_content` has been updated with new content.

### Summarization Process

* **FR3:** The microservice will retrieve the scraped text content from the `scraped_contents` table.
* **FR4:** It will call the DeepSeek R1 API (using model identifier `deepseek-reasoner`) to generate a summary.
* **FR5:** The API call will be made using an HTTP POST request with appropriate headers (including the DeepSeek API key stored as an environment variable).

### Posting the Summary

* **FR6:** Once the summary is generated, the microservice will insert a new record into the `messages` table. The record will contain:
    * Message content: The AI-generated summary.
    * Sender identifier: "Dialect AI."
    * Timestamp: The current time.
    * Reference data: (Optional) the original URL or a link to the `scraped_contents` record.
* **FR7:** The Next.js frontend (already configured to subscribe to Supabase changes) will display this new message in the group chat as a message from "Dialect AI."

### Error Handling & Logging

* **FR8:** The microservice must include error handling (retry logic, logging of API failures) in case DeepSeek R1 API calls fail.
* **FR9:** In the event of failure, the service should log the error and optionally insert an error message into the chat (e.g., "Dialect AI is unable to generate a summary at this time.").


## Non-Functional Requirements

* **Performance:** Summaries should be generated and posted within 5–10 seconds after the user clicks the button.
* **Scalability:** The microservice must handle concurrent summarization requests as the volume of shared URLs increases.
* **Reliability:** The service should operate independently to ensure that issues with summarization do not affect the group chat's real-time performance.
* **Security:** API keys and sensitive configuration data must be securely stored via environment variables. All communication should use HTTPS.
* **Maintainability:** Code should be modular, well-documented, and adhere to best practices for Node.js and Express. The service must be easy to update and debug using tools like Cursor.


## Technical Architecture

### Components

**Existing Components:**

* Group Chat Application: Built with Next.js and Supabase.
* Firecrawl URL Scraper: Scrapes URL content and stores it in `scraped_contents.text_content`.

**New Component:** AI Summarization Microservice

* **Runtime:** Node.js with Express.
* **Functionality:**
    * Listens for new or updated records in `scraped_contents`.
    * Calls the DeepSeek R1 API for summarization.
    * Inserts the summary as a new message in the `messages` table with sender "Dialect AI."
* **Deployment:** Hosted on Render.


### Data Flow Diagram

1. **User Action:** User clicks the "Summarize" button in the group chat.
2. **Scraped Content:** Firecrawl.dev updates `scraped_contents.text_content`.
3. **Microservice Trigger:** The microservice detects the updated record via Supabase realtime subscriptions (or polling).
4. **Summarization:** The microservice sends the scraped text to DeepSeek R1 and receives the summary.
5. **Chat Message Insertion:** The microservice writes the summary into the `messages` table with sender "Dialect AI."
6. **Frontend Display:** Next.js chat UI displays the new AI-generated message.


## Integration & Deployment

* **Local Development:** Use Cursor (with AI-assisted code editing) to develop and test the microservice locally.
* **Deployment on Render:** Configure the service for deployment on Render. Set environment variables for the DeepSeek API key and any necessary Supabase credentials.
* **API Testing:** Verify that the microservice correctly handles summarization requests and posts messages to the chat.


## Timeline & Milestones

**step 1:**

* Define API endpoints and data access for `scraped_contents` and `messages`.
* Develop initial microservice skeleton using Express.

**step 2:**

* Implement event detection and DeepSeek R1 API integration.
* Insert summary messages into the `messages` table.

**step 3:**

* Integrate error handling, logging, and monitoring.
* Perform integration testing with the Next.js chat application.

**step 4:**

* Deploy the microservice to Render.
* Beta test with a subset of users and collect feedback.
* Final adjustments and documentation updates.


## Success Metrics

* **Latency:** Summary messages are posted within 5–10 seconds of triggering.
* **Usage:** At least 20% of users sharing URLs request summaries.
* **Reliability:** Fewer than 2% summarization requests fail.
* **User Satisfaction:** Positive feedback from users regarding clarity and usefulness of summaries.


## Risks & Mitigations

* **Risk:** DeepSeek R1 API response delays or failures.
    * **Mitigation:** Implement retry logic and fallback error messages.
* **Risk:** Incorrect or unhelpful summaries.
    * **Mitigation:** Allow user feedback on summaries to iterate and improve prompt engineering.
* **Risk:** Integration issues with Supabase.
    * **Mitigation:** Thorough integration and end-to-end testing; use Supabase's realtime features for robustness.


    ## References & Documentation

    * [Node.js Documentation](Node.js Docs) 
    * [Express.js Documentation](Express.js Docs)
    * [Express 4.x API Reference](Express 4.x API Reference)
    * [Render Documentation](Render Docs)
    * [DeepSeek R1 API Documentation](DeepSeek API Docs)
    * [DeepSeek R1 Release Notes](DeepSeek R1 Release Notes)

## Implementation Plan

Below is the detailed plan for designing and implementing the Node.js/Express microservice for AI URL summarization:

### 1. Overview

- **Objective:**  
  When a URL sharing event occurs (with the scraped text stored in `scraped_contents`), the microservice detects "pending" records, calls DeepSeek R1 to generate a summary, and posts the summary as a new message by "Dialect AI."  
- **Flow:**  
  1. A user triggers summarization by pressing the "Summarize" button.  
  2. The frontend or a database trigger marks the corresponding record in `scraped_contents` as `pending`.  
  3. The microservice (via polling or realtime subscriptions) detects pending records.  
  4. For each record:
     - Mark as `in_progress`
     - Call DeepSeek R1 with the scraped text
     - Insert a record in the `messages` table (sender: Dialect AI)
     - Update the record to `completed` or mark as `failed` on error

### 2. Technology & Environment Setup ✅

- ✅ **Language/Framework:** Node.js with Express  
- ✅ **Supabase Integration:** Using the official Supabase JavaScript client (`@supabase/supabase-js`)
- ✅ **API Calls:** Using `node-fetch` for DeepSeek API requests  
- ✅ **Configuration:** Managed via environment variables (`dotenv`)  
- ✅ **Local Testing:** Initial setup complete, facing some issues to resolve

### 3. Project Structure ✅

Implemented file layout:
```
/ai-summarization-service
├── package.json
├── .env
└── src
    ├── app.js             // Main Express application and polling logic
    ├── services
    │   └── summarization.js // Core logic to query, process, and update pending records
    ├── utils
    │   └── deepseek.js    // Utility to call the DeepSeek API
    └── lib
        └── supabaseClient.js // Supabase client initialization
```

### 4. Implementation Status

#### ✅ Step 1: Environment & Package Setup - COMPLETED
- ✅ Initialized project with `package.json`
- ✅ Installed required packages
- ✅ Created `.env` file with necessary configuration
- ✅ Set up project structure

#### 🔄 Step 2: Express Application - IN PROGRESS
- ✅ Basic Express server setup
- ✅ Health check endpoint
- ✅ Manual trigger endpoint
- ✅ Polling mechanism


#### 🔄 Step 3: Database Integration - IN PROGRESS
- ✅ Supabase client initialization
- ✅ Basic query structure


#### ⏳ Step 4: DeepSeek Integration - PENDING
- ✅ Basic API client setup
- ⏳ Testing with actual content pending
- ⏳ Error handling implementation pending

### Current Issues to Resolve


### Next Steps

1. **Immediate:**
  
2. **Short-term:**
   - Complete DeepSeek integration testing
   - Add comprehensive error logging
   - Implement retry logic for failed attempts

3. **Medium-term:**
   - Add monitoring and metrics
   - Implement rate limiting
   - Add test coverage

---

This updated PRD now includes a comprehensive implementation plan for building, testing (locally), and eventually deploying your AI URL summarization microservice using Node.js/Express. Happy coding and testing!