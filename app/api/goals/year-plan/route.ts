import { NextResponse } from 'next/server'
import { getRemainingYearPlan } from '@/lib/goals/hierarchy'
import { yearPlanArtifactJsonSchema } from '@/lib/goals/plan-artifact-schema'

export async function GET() {
  const plan = getRemainingYearPlan(new Date())
  return NextResponse.json({
    data: plan,
    schema: yearPlanArtifactJsonSchema,
  })
}
