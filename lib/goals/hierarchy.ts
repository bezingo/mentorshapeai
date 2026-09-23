import { z } from 'zod'

export const GOAL_HIERARCHY_LEVELS = [
  'long_term',
  'year',
  'quarter',
  'month',
  'week',
  'day',
] as const

export type GoalHierarchyLevel = (typeof GOAL_HIERARCHY_LEVELS)[number]

export const GoalHierarchyLevelSchema = z.enum(GOAL_HIERARCHY_LEVELS)

export type GoalHierarchyNode = {
  id?: string
  title: string
  description?: string | null
  hierarchy_level: GoalHierarchyLevel
  plan_year?: number | null
  period_key?: string | null
  sort_order?: number
  children?: GoalHierarchyNode[]
}

export const GoalHierarchyNodeSchema: z.ZodType<GoalHierarchyNode> = z.lazy(() =>
  z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    hierarchy_level: GoalHierarchyLevelSchema,
    plan_year: z.number().int().min(2000).max(2100).optional().nullable(),
    period_key: z.string().max(32).optional().nullable(),
    sort_order: z.number().int().min(0).default(0),
    children: z.array(GoalHierarchyNodeSchema).optional(),
  })
)

export const CreateHierarchyPayloadSchema = z.object({
  root: GoalHierarchyNodeSchema,
  replace_existing: z.boolean().default(false),
})

export type CreateHierarchyPayload = z.infer<typeof CreateHierarchyPayloadSchema>

const CHILD_LEVEL: Partial<Record<GoalHierarchyLevel, GoalHierarchyLevel>> = {
  long_term: 'year',
  year: 'quarter',
  quarter: 'month',
  month: 'week',
  week: 'day',
}

export function nextHierarchyLevel(
  level: GoalHierarchyLevel
): GoalHierarchyLevel | null {
  return CHILD_LEVEL[level] ?? null
}

export function quarterKey(year: number, quarter: number): string {
  return `${year}-Q${quarter}`
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function isoWeekKey(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

export function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export interface RemainingYearPlan {
  plan_year: number
  as_of: string
  remaining_months: { month: number; key: string; label: string }[]
  remaining_quarters: { quarter: number; key: string; label: string }[]
  remaining_weeks_count: number
  remaining_days_in_year: number
}

export function getRemainingYearPlan(from: Date = new Date()): RemainingYearPlan {
  const year = from.getFullYear()
  const month = from.getMonth() + 1
  const quarter = getQuarter(from)

  const remainingMonths: RemainingYearPlan['remaining_months'] = []
  for (let m = month; m <= 12; m++) {
    const label = new Date(year, m - 1, 1).toLocaleString('en-US', { month: 'long' })
    remainingMonths.push({ month: m, key: monthKey(year, m), label })
  }

  const remainingQuarters: RemainingYearPlan['remaining_quarters'] = []
  for (let q = quarter; q <= 4; q++) {
    remainingQuarters.push({ quarter: q, key: quarterKey(year, q), label: `Q${q} ${year}` })
  }

  const endOfYear = new Date(year, 11, 31)
  const remainingDays = Math.max(
    0,
    Math.ceil((endOfYear.getTime() - from.getTime()) / 86400000)
  )

  const weeksLeft = Math.max(0, 52 - getIsoWeek(from) + 1)

  return {
    plan_year: year,
    as_of: from.toISOString(),
    remaining_months: remainingMonths,
    remaining_quarters: remainingQuarters,
    remaining_weeks_count: weeksLeft,
    remaining_days_in_year: remainingDays,
  }
}

export interface BuildYearHierarchyOptions {
  yearGoalTitle: string
  longTermTitle?: string
  from?: Date
}

/** Builds a default year → quarter → month skeleton for the remainder of the calendar year. */
export function buildRemainderOfYearHierarchy(
  options: BuildYearHierarchyOptions
): GoalHierarchyNode {
  const from = options.from ?? new Date()
  const plan = getRemainingYearPlan(from)
  const year = plan.plan_year

  const quarterNodes: GoalHierarchyNode[] = plan.remaining_quarters.map((q, qi) => {
    const monthsInQuarter = plan.remaining_months.filter(
      (m) => Math.ceil(m.month / 3) === q.quarter
    )
    return {
      title: q.label,
      hierarchy_level: 'quarter',
      plan_year: year,
      period_key: q.key,
      sort_order: qi,
      children: monthsInQuarter.map((m, mi) => ({
        title: m.label,
        hierarchy_level: 'month',
        plan_year: year,
        period_key: m.key,
        sort_order: mi,
        children: [],
      })),
    }
  })

  const yearNode: GoalHierarchyNode = {
    title: options.yearGoalTitle,
    hierarchy_level: 'year',
    plan_year: year,
    period_key: String(year),
    sort_order: 0,
    children: quarterNodes,
  }

  if (options.longTermTitle) {
    return {
      title: options.longTermTitle,
      hierarchy_level: 'long_term',
      sort_order: 0,
      children: [yearNode],
    }
  }

  return yearNode
}

export function flattenHierarchy(
  node: GoalHierarchyNode,
  parentLevel: GoalHierarchyLevel | null = null
): GoalHierarchyNode[] {
  const level = node.hierarchy_level
  if (parentLevel) {
    const expected = nextHierarchyLevel(parentLevel)
    const validLongTermYear = parentLevel === 'long_term' && level === 'year'
    if (expected !== level && !validLongTermYear) {
      throw new Error(`Invalid hierarchy: ${parentLevel} cannot parent ${level}`)
    }
  }
  const out: GoalHierarchyNode[] = [node]
  for (const child of node.children ?? []) {
    out.push(...flattenHierarchy(child, level))
  }
  return out
}
