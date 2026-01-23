'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { GoalPlannerChat } from '@/components/goals/goal-planner-chat'

export default function CreateGoalPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/mentee/goals">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </Button>
        </Link>
      </div>

      <GoalPlannerChat />
    </div>
  )
}
