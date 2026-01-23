# Goal Advisor Setup Guide

## Overview

The Goal Advisor is a conversational AI agent that provides real-time mentoring guidance through a chat interface. It combines Vercel AI SDK for streaming chat with LangChain for complex tool orchestration.

## Prerequisites

- OpenAI API key
- Supabase project with database access
- Firecrawl API key (for link parsing)
- Optional: Pipedream, Notion, and Google OAuth credentials for integrations

## 1. Database Migration

Run the Goal Advisor database migration:

```bash
# Apply migration to Supabase
# This creates tables for conversations, messages, and memory
supabase db push supabase/migrations/013_goal_advisor_conversations.sql
```

**Tables Created:**
- `goal_conversations` - Conversation threads
- `goal_conversation_messages` - Individual chat messages
- `goal_conversation_memory` - Attached files and links

## 2. Supabase Storage Bucket

Create a storage bucket for file attachments:

### Via Supabase Dashboard:
1. Go to Storage in Supabase Dashboard
2. Click "Create new bucket"
3. Name: `goal-advisor-attachments`
4. Public bucket: **Yes** (for file URLs)
5. Click "Create bucket"

### Via SQL:
```sql
-- Create storage bucket
insert into storage.buckets (id, name, public)
values ('goal-advisor-attachments', 'goal-advisor-attachments', true);

-- Set up RLS policies for the bucket
create policy "Users can upload their own attachments"
on storage.objects for insert
with check (
  bucket_id = 'goal-advisor-attachments' AND
  (storage.foldername(name))[1] IN (
    select id::text from goal_conversations where profile_id = auth.uid()
  )
);

create policy "Users can view their own attachments"
on storage.objects for select
using (
  bucket_id = 'goal-advisor-attachments' AND
  (storage.foldername(name))[1] IN (
    select id::text from goal_conversations where profile_id = auth.uid()
  )
);

create policy "Users can delete their own attachments"
on storage.objects for delete
using (
  bucket_id = 'goal-advisor-attachments' AND
  (storage.foldername(name))[1] IN (
    select id::text from goal_conversations where profile_id = auth.uid()
  )
);
```

## 3. Environment Variables

Add these variables to your `.env.local` file:

### Required:
```bash
# AI Services (already required for other features)
OPENAI_API_KEY=sk-...

# Firecrawl (already required for LinkedIn import)
FIRECRAWL_API_KEY=fc-...
```

### Optional Integrations:

#### Pipedream (Calendar Booking)
```bash
PIPEDREAM_WEBHOOK_URL=https://your-pipedream-workflow-url
```

**Setup Pipedream Workflow:**
1. Create account at pipedream.com
2. Create new workflow with HTTP trigger
3. Add steps for:
   - Parse incoming JSON payload
   - Call Google Calendar or Outlook Calendar API
   - Return booking confirmation URL
4. Copy webhook URL to env variable

#### Notion Integration
```bash
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=... # optional
```

**Setup Notion:**
1. Go to https://www.notion.so/my-integrations
2. Create new integration
3. Copy Internal Integration Token
4. Share your Notion workspace with the integration

#### Google Docs Export
```bash
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=...
```

**Setup Google OAuth:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add scopes: `https://www.googleapis.com/auth/documents`, `https://www.googleapis.com/auth/drive.file`
4. Set redirect URI to your app URL + `/api/auth/google/callback`

## 4. Feature Testing

### Basic Chat Flow:
1. Navigate to any goal detail page
2. Click "AI Advisor" button (bottom-right)
3. Chat drawer should open
4. Try sending a message: "Help me improve my goal"
5. AI should respond with guidance

### File Upload:
1. Open Goal Advisor
2. Click paperclip icon
3. Upload a PDF or text file
4. File should appear in attachments bar
5. Ask AI about the file: "What's in the file I just uploaded?"

### Link Parsing:
1. Open Goal Advisor
2. Click link icon
3. Paste a URL (e.g., article or documentation)
4. AI should parse and use the content

### Tool Invocation:
1. Ask AI: "Can you run a SWOT analysis?"
2. AI should use `analyzeGoal` tool
3. Results should be displayed and saved to goal

## 5. Features Overview

### Available Tools:

1. **refineGoal** - Improve specific goal aspects
   - Example: "Refine my milestones"
   - Updates: goal statement, milestones, questions, risks

2. **analyzeGoal** - Strategic analysis
   - Example: "Run a SWOT analysis"
   - Types: SWOT, SMART framework

3. **bookCalendar** - Schedule meetings
   - Example: "Book a 30-minute meeting with mentor@example.com tomorrow at 2pm"
   - Requires: Pipedream integration

4. **exportToNotion** - Export to Notion
   - Example: "Export this goal to Notion"
   - Requires: Notion integration

5. **exportToGoogleDocs** - Export to Google Docs
   - Example: "Create a Google Doc for this goal"
   - Requires: Google OAuth

6. **searchMemory** - Search attachments
   - Example: "Find information about X in my files"
   - Searches uploaded files and links

7. **findMentors** - Match with mentors
   - Status: Coming soon
   - Will integrate with mentor matching system

## 6. Customization

### System Prompt
Edit the system prompt in `lib/ai/goal-advisor-prompt.ts` to customize:
- Tone and personality
- Response style
- Tool usage patterns
- Context formatting

### Tool Behavior
Modify tool functions in `lib/ai/goal-advisor-tools.ts` to:
- Change tool logic
- Add new tools
- Customize integrations

### UI Customization
Edit `components/goals/goal-advisor-drawer.tsx` to:
- Change drawer width/position
- Customize styling
- Add new UI elements
- Modify message display

## 7. Troubleshooting

### "Conversation not initialized" error
- Check database migration was applied
- Verify user has access to the goal
- Check browser console for API errors

### File upload fails
- Verify storage bucket exists
- Check bucket is public
- Verify RLS policies are correct
- Check file size (max 10MB)

### Tool invocation errors
- Check API keys in environment variables
- Verify integration credentials
- Check console for detailed error messages

### Streaming doesn't work
- Ensure using Next.js 14+ with App Router
- Check `runtime = 'nodejs'` in API route
- Verify Vercel AI SDK is installed correctly

## 8. Production Considerations

### Performance:
- Conversation history can grow large - consider pagination
- File uploads should be rate-limited
- Consider caching frequently accessed data

### Security:
- All conversations are user-scoped via RLS
- File uploads are validated for type and size
- OAuth tokens should be stored securely per-user
- API keys should never be exposed to client

### Monitoring:
- Track conversation length and token usage
- Monitor tool invocation success rates
- Set up alerts for API failures
- Use LangSmith for AI agent monitoring

## 9. Future Enhancements

Planned features:
- Voice input/output
- Multi-goal conversations
- Mentor involvement in conversations
- Conversation search and insights
- Integration with sessions and collaborations
- Proactive suggestions and nudges

## Support

For issues or questions:
- Check console for error messages
- Review Supabase logs for database issues
- Test API endpoints directly with curl/Postman
- Verify all environment variables are set correctly
