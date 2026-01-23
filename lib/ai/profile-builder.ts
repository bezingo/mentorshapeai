import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'

/**
 * Schema for parsed profile data from LinkedIn or CV
 * Extended to include bio field for complete profile extraction
 */
export const ProfileDataSchema = z.object({
  display_name: z.string().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  work_experiences: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      description: z.string().nullable(),
    })
  ),
  educations: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
    })
  ),
  skills: z.array(z.string()),
})

export type ProfileData = z.infer<typeof ProfileDataSchema>

const systemPrompt = `You are an expert career parsing engine.
You convert noisy resume or LinkedIn content into clean, structured JSON for a mentoring platform.
Extract the person's name, headline/title, a professional bio/summary, work experiences, education, and skills.
Be concise, avoid hallucinations, and only include information that is clearly present in the source text.
For the bio, extract any summary, about section, or professional overview. If none exists, leave it null.`

const userPromptTemplate = `SOURCE PROFILE TEXT:
---
{source_text}
---

Return JSON with the following shape:

{
  "display_name": string | null,
  "headline": string | null,
  "bio": string | null,
  "work_experiences": [
    {
      "company": string,
      "title": string,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null,
      "description": string | null
    }
  ],
  "educations": [
    {
      "institution": string,
      "degree": string | null,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null
    }
  ],
  "skills": [string]
}

Guidelines:
- Extract the bio from any "About", "Summary", "Profile", or "Overview" section
- Keep the bio concise (max 500 characters) and professional
- For dates, use YYYY-MM format (e.g., "2020-01")
- Only include fields you are confident about
- Do NOT fabricate institutions, companies, dates, or skills
- Skills should be individual skill names, not descriptions`

export async function parseProfileText(sourceText: string): Promise<ProfileData> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', userPromptTemplate],
  ])

  const parser = new JsonOutputParser<ProfileData>()
  const chain = prompt.pipe(model).pipe(parser)

  try {
    const result = await chain.invoke({
      source_text: sourceText,
    })

    // Validate the result
    return ProfileDataSchema.parse(result)
  } catch (error) {
    console.error('Error parsing profile:', error)
    throw new Error('Failed to parse profile data')
  }
}

