import { describe, it, expect } from 'vitest'
import {
  buildRemainderOfYearHierarchy,
  flattenHierarchy,
  getIsoWeek,
  getQuarter,
  getRemainingYearPlan,
  monthKey,
  nextHierarchyLevel,
  quarterKey,
} from '@/lib/goals/hierarchy'

describe('goal hierarchy utils', () => {
  it('computes quarter from date', () => {
    expect(getQuarter(new Date('2026-02-15'))).toBe(1)
    expect(getQuarter(new Date('2026-11-01'))).toBe(4)
  })

  it('builds stable period keys', () => {
    expect(quarterKey(2026, 3)).toBe('2026-Q3')
    expect(monthKey(2026, 9)).toBe('2026-09')
  })

  it('returns remaining months and quarters for mid-year date', () => {
    const plan = getRemainingYearPlan(new Date('2026-06-15T12:00:00.000Z'))
    expect(plan.plan_year).toBe(2026)
    expect(plan.remaining_months[0].month).toBe(6)
    expect(plan.remaining_months.at(-1)?.month).toBe(12)
    expect(plan.remaining_quarters[0].quarter).toBe(2)
    expect(plan.remaining_quarters).toHaveLength(3)
    expect(plan.remaining_days_in_year).toBeGreaterThan(0)
  })

  it('walks hierarchy levels', () => {
    expect(nextHierarchyLevel('year')).toBe('quarter')
    expect(nextHierarchyLevel('day')).toBeNull()
  })

  it('builds remainder-of-year hierarchy with quarters and months', () => {
    const tree = buildRemainderOfYearHierarchy({
      yearGoalTitle: 'Grow as a mentor',
      from: new Date('2026-03-10'),
    })
    expect(tree.hierarchy_level).toBe('year')
    expect(tree.children?.length).toBeGreaterThan(0)
    const firstQuarter = tree.children?.[0]
    expect(firstQuarter?.hierarchy_level).toBe('quarter')
    expect(firstQuarter?.children?.every((m: { hierarchy_level: string }) => m.hierarchy_level === 'month')).toBe(true)
  })

  it('flattens hierarchy nodes', () => {
    const tree = buildRemainderOfYearHierarchy({
      yearGoalTitle: 'Test',
      from: new Date('2026-01-15'),
    })
    const flat = flattenHierarchy(tree)
    expect(flat.length).toBeGreaterThan(4)
  })

  it('computes iso week', () => {
    const week = getIsoWeek(new Date('2026-09-20'))
    expect(week).toBeGreaterThan(0)
    expect(week).toBeLessThanOrEqual(53)
  })
})
