# Goal Advisor - User Guide

## Overview

The Goal Advisor is your AI-powered mentor for goal refinement and achievement. Access it from any goal detail page via the floating "AI Advisor" button.

## Getting Started

### Opening the Advisor

1. Navigate to any of your goals
2. Look for the floating "AI Advisor" button (bottom-right corner)
3. Click to open the chat drawer

### First Conversation

The AI will greet you and explain what it can help with:
- Refining your goal clarity
- Running strategic analyses (SWOT/SMART)
- Creating actionable milestones
- Identifying risks and solutions
- Exporting your goal to other tools
- Scheduling time with mentors

## Features

### 1. Conversational Goal Refinement

Simply chat with the AI about your goal. It understands context and provides mentor-like guidance.

**Example conversations:**
```
You: "I'm not sure if my milestones are realistic"
AI: [Reviews your milestones and provides specific feedback]

You: "How can I make my success criteria more measurable?"
AI: [Analyzes current criteria and suggests improvements]

You: "I'm feeling stuck on milestone 2"
AI: [Asks clarifying questions and provides strategic advice]
```

### 2. File Attachments

Share documents for context:

1. Click the paperclip icon
2. Select file (PDF, text, images up to 10MB)
3. Wait for upload confirmation
4. Reference in conversation: "Based on the document I just uploaded..."

**Supported formats:**
- PDF documents
- Text files (.txt, .md)
- Images (.png, .jpg, .webp)

### 3. Link Sharing

Add web content to your conversation:

1. Click the link icon
2. Paste any URL (articles, documentation, etc.)
3. AI automatically parses and uses the content
4. Reference later: "What did that article say about..."

### 4. AI Tools

The AI can use specialized tools when appropriate:

#### Refine Goal
**Trigger:** "Refine my milestones" or "Improve my success criteria"
**What it does:** Uses the Goal Shaper agent to enhance specific aspects
**Result:** Updates your goal in the database

#### SWOT Analysis
**Trigger:** "Run a SWOT analysis"
**What it does:** Analyzes Strengths, Weaknesses, Opportunities, Threats
**Result:** Saves analysis to goal, displays insights

#### SMART Framework
**Trigger:** "Check if my goal is SMART"
**What it does:** Validates Specific, Measurable, Achievable, Relevant, Time-bound
**Result:** Provides framework breakdown with recommendations

#### Book Calendar (Requires Setup)
**Trigger:** "Schedule a meeting with my mentor"
**What it does:** Creates calendar event via Pipedream
**Requires:** Mentor email, date/time, duration

#### Export to Notion (Requires Setup)
**Trigger:** "Export this to Notion"
**What it does:** Creates formatted Notion page
**Requires:** Notion integration configured

#### Export to Google Docs (Requires Setup)
**Trigger:** "Create a Google Doc"
**What it does:** Generates formatted Google Doc
**Requires:** Google account connected

#### Search Memory
**Trigger:** "Find information about X in my files"
**What it does:** Searches your uploaded files and links
**Result:** Returns relevant excerpts

## Tips for Effective Conversations

### Be Specific
❌ "Help me with my goal"
✅ "My success criteria feels vague. Can you help make it more measurable?"

### Ask Follow-up Questions
Don't accept the first answer - dig deeper:
```
You: "What are the biggest risks for this goal?"
AI: [Lists 3 risks with mitigations]
You: "Tell me more about risk #2 and how to prevent it"
AI: [Provides detailed strategy]
```

### Use Context
Upload relevant files or share links before asking questions:
```
You: [Uploads research paper]
You: "Based on this research, is my approach aligned with best practices?"
AI: [References specific parts of the paper in response]
```

### Request Specific Actions
Be clear about what you want the AI to do:
```
✅ "Run a SWOT analysis"
✅ "Refine my milestones to be more specific"
✅ "Export this goal to Notion"
❌ "Do something with my goal"
```

### Iterate
Goals evolve - use the advisor throughout your journey:
- **Week 1:** Initial refinement and planning
- **Week 2:** Check progress, adjust milestones
- **Week 3:** Identify blockers, get unstuck
- **Week 4:** Prepare for mentor session
- **Throughout:** Share updates and get continuous feedback

## Conversation Management

### Persistent History
- Conversations are automatically saved
- Resume anytime - full history maintained
- Context carries over between sessions

### Attachments
- Files and links persist in conversation
- AI can reference them in future messages
- Remove attachments using the X button

### Multiple Conversations
- Each goal has its own conversation thread
- Switch between goals to access different contexts
- History is goal-specific

## Common Use Cases

### 1. Goal Setup
```
You: "I just created this goal. Can you help me make it better?"
AI: [Asks clarifying questions about your situation]
You: [Provides details]
AI: "Would you like me to refine your goal statement and milestones?"
You: "Yes"
AI: [Uses refineGoal tool, updates goal]
```

### 2. Progress Check
```
You: "I'm on milestone 2 but feeling behind schedule"
AI: [Reviews milestones and timeline]
AI: "Let's run a SMART analysis to see if the timeline is realistic"
AI: [Uses analyzeGoal tool]
AI: "Based on the analysis, here's what I recommend..."
```

### 3. Pre-Mentor Session
```
You: "I have a session with my mentor tomorrow. What should I discuss?"
AI: [Reviews current progress and blockers]
AI: "Here are 5 key questions you should ask based on where you are"
```

### 4. Milestone Planning
```
You: "I need to break down milestone 3 into smaller tasks"
AI: [Analyzes milestone]
AI: "Here's a weekly breakdown with specific actions for each week"
```

### 5. Risk Management
```
You: "What could go wrong with this approach?"
AI: "Let me run a SWOT analysis to identify potential issues"
AI: [Uses analyzeGoal tool with type='swot']
AI: "Here are the main threats and how to mitigate them"
```

## Keyboard Shortcuts

- **Send message:** `Enter`
- **New line:** `Shift + Enter`
- **Close drawer:** `Esc` (when focus is on drawer)

## Privacy & Data

- Conversations are private to you
- Only you can access your chat history
- Files uploaded are stored securely
- AI uses context only for your goals
- Tool actions require your explicit consent

## Limitations

### Current Limitations:
- Maximum 10MB file size
- No voice input/output (yet)
- Calendar booking requires Pipedream setup
- Notion/Google Docs require integrations
- Mentor matching not yet available

### Coming Soon:
- Multi-goal conversations
- Voice interactions
- Mentor involvement in chats
- Proactive suggestions
- Session integration
- Collaboration features

## Troubleshooting

### Chat not loading
- Refresh the page
- Check internet connection
- Verify you're logged in

### File upload fails
- Check file size (max 10MB)
- Verify file type is supported
- Try a different file

### Tool not working
- Check if integration is configured (Notion, Google, etc.)
- Contact support if persistent

### Slow responses
- Complex questions take longer
- Tool invocations add processing time
- Check your internet connection

## Best Practices

1. **Start with context:** Share your situation before asking questions
2. **Be conversational:** Talk naturally, like with a real mentor
3. **Ask for clarification:** If response isn't helpful, ask for more details
4. **Use tools proactively:** Request analyses and refinements regularly
5. **Update the AI:** Share progress and setbacks for better guidance
6. **Reference attachments:** Upload relevant files for context
7. **Iterate:** Refine your goal throughout the journey

## Getting Help

If you need assistance:
- Ask the AI: "How do I use [feature]?"
- Check setup documentation
- Contact support team
- Report bugs or feature requests

## Feedback

We're constantly improving! Share your experience:
- What works well?
- What's confusing?
- What features would you like?
- How can the AI be more helpful?

---

**Remember:** The Goal Advisor is a tool to augment your thinking, not replace it. Use it to clarify your ideas, identify blind spots, and get unstuck - but you're still the expert on your own goals.
