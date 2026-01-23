import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'

/**
 * Schema for SWOT analysis structure
 */
export const SWOTAnalysisSchema = z.object({
  strengths: z.array(z.string()).min(2).max(10),
  weaknesses: z.array(z.string()).min(2).max(10),
  opportunities: z.array(z.string()).min(2).max(10),
  threats: z.array(z.string()).min(2).max(10),
})

export type SWOTAnalysis = z.infer<typeof SWOTAnalysisSchema>

/**
 * Schema for SMART framework structure
 */
export const SMARTFrameworkSchema = z.object({
  specific: z.string().min(50).max(500),
  measurable: z.string().min(50).max(500),
  achievable: z.string().min(50).max(500),
  relevant: z.string().min(50).max(500),
  time_bound: z.string().min(50).max(500),
})

export type SMARTFramework = z.infer<typeof SMARTFrameworkSchema>

/**
 * Input interface for SWOT analysis generation
 */
export interface SWOTAnalysisInput {
  title: string
  description?: string | null
  current_challenges?: string | null
  milestones?: Array<{
    title: string
    description: string
  }>
  risks_pitfalls?: Array<{
    risk: string
    mitigation: string
  }> | null
  category?: string | null
}

/**
 * Input interface for SMART framework generation
 */
export interface SMARTFrameworkInput {
  title: string
  description?: string | null
  success_definition?: string | null
  duration_days: 30 | 60
  category?: string | null
}

/**
 * Input interface for mentor notes generation
 */
export interface MentorNotesInput {
  title: string
  description?: string | null
  current_challenges?: string | null
  success_definition?: string | null
  milestones?: Array<{
    title: string
    description: string
  }>
  swot_analysis?: SWOTAnalysis | null
  smart_framework?: SMARTFramework | null
  category?: string | null
}

/**
 * System prompt for SWOT analysis
 */
const swotSystemPrompt = `You are an expert business analyst specializing in SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis.
Your role is to analyze goals and provide structured SWOT insights that help mentees understand their position and mentors provide targeted guidance.

Guidelines:
- Strengths: Internal positive attributes, skills, resources that help achieve the goal
- Weaknesses: Internal limitations, gaps, or challenges that hinder progress
- Opportunities: External factors, trends, or situations that could benefit goal achievement
- Threats: External risks, obstacles, or challenges that could impede progress
- Be specific and actionable, not generic
- Consider the goal category and context when generating insights
- Generate 3-5 items per category (minimum 2, maximum 10)`

/**
 * User prompt template for SWOT analysis
 */
const swotUserPromptTemplate = `Analyze the following goal and generate a comprehensive SWOT analysis:

GOAL TITLE: {title}
DESCRIPTION: {description}
CURRENT CHALLENGES: {challenges}
CATEGORY: {category}
MILESTONES: {milestones}
RISKS & PITFALLS: {risks}

You must return ONLY valid JSON with this exact structure (no markdown, no code blocks, no extra text):
{{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "threats": ["threat 1", "threat 2", "threat 3"]
}}

IMPORTANT: Return ONLY the JSON object. Generate 3-5 specific, actionable items for each category. Ensure all strings are properly escaped and the JSON is valid.`

/**
 * System prompt for SMART framework
 */
const smartSystemPrompt = `You are an expert goal-setting coach specializing in the SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound).
Your role is to break down goals into clear SMART criteria that help mentees understand exactly what they need to achieve and mentors provide focused guidance.

Guidelines:
- Specific: Clear, well-defined goal statement (what exactly needs to be achieved)
- Measurable: Quantifiable criteria for success (how will progress be measured)
- Achievable: Realistic assessment of feasibility (is this goal attainable)
- Relevant: Alignment with broader objectives (why does this goal matter)
- Time-bound: Clear deadline and timeline (when will this be achieved)
- Be detailed and actionable for each criterion
- Consider the goal category and duration when generating insights`

/**
 * User prompt template for SMART framework
 */
const smartUserPromptTemplate = `Break down the following goal into SMART criteria:

GOAL TITLE: {title}
DESCRIPTION: {description}
SUCCESS DEFINITION: {success_definition}
DURATION: {duration_days} days
CATEGORY: {category}

Return JSON with this structure:
{{
  "specific": "Detailed specific goal statement",
  "measurable": "How success will be measured",
  "achievable": "Assessment of feasibility and resources needed",
  "relevant": "Why this goal matters and aligns with objectives",
  "time_bound": "Timeline and deadline details"
}}

Provide detailed, actionable insights for each criterion (50-500 characters each).`

/**
 * System prompt for mentor notes
 */
const mentorNotesSystemPrompt = `You are an expert mentoring coordinator preparing comprehensive notes for mentors.
Your role is to synthesize goal information into clear, actionable notes that help mentors quickly understand the mentee's situation and provide effective guidance.

Guidelines:
- Provide context about the goal and mentee's situation
- Highlight key areas where mentorship would be most valuable
- Suggest focus areas for mentor sessions
- Include relevant background from SWOT and SMART analysis
- Be concise but comprehensive (aim for 300-800 words)
- Write in a professional, supportive tone
- Focus on actionable insights for mentors`

/**
 * User prompt template for mentor notes
 */
const mentorNotesUserPromptTemplate = `Generate comprehensive mentor notes for the following goal:

GOAL TITLE: {title}
DESCRIPTION: {description}
CHALLENGES: {challenges}
SUCCESS DEFINITION: {success_definition}
CATEGORY: {category}
DURATION: {duration_days} days

MILESTONES:
{milestones}

SWOT ANALYSIS:
{swot_analysis}

SMART FRAMEWORK:
{smart_framework}

Return a comprehensive text document (300-800 words) that:
1. Provides context about the goal and mentee's situation
2. Highlights key areas where mentorship would be valuable
3. Suggests focus areas for mentor sessions
4. Includes relevant insights from SWOT and SMART analysis
5. Helps mentors quickly understand how to provide effective guidance

Write in a professional, supportive tone. Focus on actionable insights.`

/**
 * Generate SWOT analysis for a goal
 */
export async function generateSWOTAnalysis(input: SWOTAnalysisInput): Promise<SWOTAnalysis> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', swotSystemPrompt],
    ['human', swotUserPromptTemplate],
  ])

  const parser = new JsonOutputParser<SWOTAnalysis>({
    strict: true,
  })
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const milestonesText = input.milestones
      ? input.milestones.map((m) => `- ${m.title}: ${m.description}`).join('\n')
      : 'None specified'

    const risksText = input.risks_pitfalls
      ? input.risks_pitfalls.map((r) => `- ${r.risk}: ${r.mitigation}`).join('\n')
      : 'None specified'

    const result = await chain.invoke({
      title: input.title,
      description: input.description || 'No description provided',
      challenges: input.current_challenges || 'No specific challenges mentioned',
      category: input.category || 'General',
      milestones: milestonesText,
      risks: risksText,
    })

    // Ensure result is an object, not a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result
    
    return SWOTAnalysisSchema.parse(parsedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('SWOT Analysis validation error:', error.errors)
      throw new Error(`Invalid SWOT analysis: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (error instanceof SyntaxError || (error instanceof Error && (error.message.includes('JSON') || error.message.includes('parse')))) {
      console.error('JSON parsing error in SWOT analysis:', error)
      throw new Error('Failed to parse SWOT analysis JSON. The AI response was invalid. Please try again.')
    }

    console.error('Error generating SWOT analysis:', error)
    throw new Error(`Failed to generate SWOT analysis: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Generate SMART framework for a goal
 */
export async function generateSMARTFramework(input: SMARTFrameworkInput): Promise<SMARTFramework> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', smartSystemPrompt],
    ['human', smartUserPromptTemplate],
  ])

  const parser = new JsonOutputParser<SMARTFramework>({
    strict: true,
  })
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke({
      title: input.title,
      description: input.description || 'No description provided',
      success_definition: input.success_definition || 'No success definition provided',
      duration_days: input.duration_days,
      category: input.category || 'General',
    })

    // Ensure result is an object, not a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result
    
    return SMARTFrameworkSchema.parse(parsedResult)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('SMART Framework validation error:', error.errors)
      throw new Error(`Invalid SMART framework: ${error.errors.map((e) => e.message).join(', ')}`)
    }

    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('JSON'))) {
      console.error('JSON parsing error in SMART framework:', error)
      throw new Error('Failed to parse SMART framework JSON. The AI response was invalid. Please try again.')
    }

    console.error('Error generating SMART framework:', error)
    throw new Error(`Failed to generate SMART framework: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Generate mentor notes for a goal
 */
export async function generateMentorNotes(input: MentorNotesInput): Promise<string> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', mentorNotesSystemPrompt],
    ['human', mentorNotesUserPromptTemplate],
  ])

  const chain = prompt.pipe(model)

  try {
    const milestonesText = input.milestones
      ? input.milestones.map((m) => `- ${m.title}: ${m.description}`).join('\n')
      : 'None specified'

    const swotText = input.swot_analysis
      ? `Strengths: ${input.swot_analysis.strengths.join(', ')}\nWeaknesses: ${input.swot_analysis.weaknesses.join(', ')}\nOpportunities: ${input.swot_analysis.opportunities.join(', ')}\nThreats: ${input.swot_analysis.threats.join(', ')}`
      : 'Not yet analyzed'

    const smartText = input.smart_framework
      ? `Specific: ${input.smart_framework.specific}\nMeasurable: ${input.smart_framework.measurable}\nAchievable: ${input.smart_framework.achievable}\nRelevant: ${input.smart_framework.relevant}\nTime-bound: ${input.smart_framework.time_bound}`
      : 'Not yet analyzed'

    const result = await chain.invoke({
      title: input.title,
      description: input.description || 'No description provided',
      challenges: input.current_challenges || 'No specific challenges mentioned',
      success_definition: input.success_definition || 'No success definition provided',
      category: input.category || 'General',
      duration_days: input.duration_days || 30,
      milestones: milestonesText,
      swot_analysis: swotText,
      smart_framework: smartText,
    })

    // Extract text content from the response
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
    
    // Validate length (300-2000 words approximately)
    if (content.length < 300) {
      throw new Error('Generated mentor notes are too short')
    }

    return content
  } catch (error) {
    console.error('Error generating mentor notes:', error)
    throw new Error(`Failed to generate mentor notes: ${error instanceof Error ? error.message : String(error)}`)
  }
}

