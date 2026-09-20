import { z } from 'zod'

export const OrgMemberRoles = ['admin', 'mentor', 'mentee'] as const
export const ProgramParticipantRoles = ['mentor', 'mentee'] as const

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(120),
  type: z.string().max(80).optional().nullable(),
  domain: z
    .string()
    .max(253)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain format')
    .optional()
    .nullable(),
})

export const JoinOrganizationSchema = z.object({
  invite_code: z
    .string()
    .min(6, 'Invite code is required')
    .max(32)
    .transform((v) => v.trim().toLowerCase()),
  role: z.enum(['mentor', 'mentee']).default('mentee'),
})

export const CreateProgramSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  settings: z.record(z.unknown()).optional().nullable(),
})

export const EnrollProgramParticipantSchema = z.object({
  role: z.enum(ProgramParticipantRoles),
  profile_id: z.string().uuid('Invalid profile ID').optional(),
  email: z.string().email().optional(),
})

export const SelfEnrollProgramSchema = z.object({
  role: z.enum(ProgramParticipantRoles),
})

export const ProgramMatchQuerySchema = z.object({
  mentee_profile_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})
