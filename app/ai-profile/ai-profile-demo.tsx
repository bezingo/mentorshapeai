'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { RiArrowLeftLine, RiSparklingLine } from '@remixicon/react'
import { Avatar } from '@/components/base/avatar/avatar'
import { Chip } from '@/components/base/badges/chip'
import { Divider } from '@/components/base/divider/divider'
import { ThemeToggle } from '@/components/application/theme/theme-toggle'

/**
 * Demo of BoardUI profile patterns composed from free primitives: the cover
 * card, an activity heat grid (contributions-grid CSS shipped with the
 * BoardUI globals), and stat tiles. The Pro `template-ai-profile` adds full
 * chart cards on top of this shape; the product profile page under
 * /dashboard/profile uses the same card/sidebar patterns with real data.
 */

const WEEKS = 26
const DAYS = 7

// Deterministic pseudo-random tiers so server and client render identically.
function tierFor(week: number, day: number) {
  const seed = Math.sin(week * 37.1 + day * 13.7) * 43758.5453
  const value = seed - Math.floor(seed)
  if (value > 0.92) return 5
  if (value > 0.8) return 4
  if (value > 0.66) return 3
  if (value > 0.5) return 2
  if (value > 0.32) return 1
  return 0
}

const STATS = [
  { label: 'Goals completed', value: '12', delta: '+3 this term', color: 'lime' as const },
  { label: 'Mentor sessions', value: '38', delta: '+6 this month', color: 'purple' as const },
  { label: 'Focus streak', value: '21 days', delta: 'personal best', color: 'cyan' as const },
]

const CARD_HIDDEN = { opacity: 0, scale: 0.95, filter: 'blur(2px)' }
const CARD_SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const CARD_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const

export function AiProfileDemo() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="min-h-screen bg-background-full">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-separator-border bg-background-full/80 px-6 backdrop-blur-md">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-body-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          <RiArrowLeftLine className="size-4" aria-hidden />
          Back to dashboard
        </Link>
        <span className="flex items-center gap-2 text-headline-semibold text-text-primary">
          <RiSparklingLine className="size-5 text-button-ghost-foreground" aria-hidden />
          BoardUI Profile
        </span>
        <ThemeToggle appearance="segmented" />
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        {/* Cover card */}
        <motion.section
          initial={reduceMotion ? false : CARD_HIDDEN}
          animate={CARD_SHOWN}
          transition={CARD_TRANSITION}
          className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-xs"
        >
          <div className="h-24 bg-gradient-to-r from-accent-400 to-accent-600" />
          <div className="px-6 pb-6">
            <div className="-mt-6 flex items-end gap-4">
              <span className="rounded-full ring-4 ring-background-primary-default">
                <Avatar size="lg" color="blue" initials="H" className="size-16 text-title-2-semibold" />
              </span>
              <div className="pb-1">
                <h1 className="text-title-2-semibold text-text-primary">Hassanain</h1>
                <p className="text-body-regular text-text-secondary">
                  Mentee · School pilot cohort
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Chip color="purple">Goal Planner</Chip>
              <Chip color="cyan">Goal Advisor</Chip>
              <Chip color="lime">On track</Chip>
              <Chip color="soft">BoardUI demo</Chip>
            </div>
          </div>
        </motion.section>

        {/* Stat tiles */}
        <div className="grid gap-4 sm:grid-cols-3">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={reduceMotion ? false : CARD_HIDDEN}
              animate={CARD_SHOWN}
              transition={{ ...CARD_TRANSITION, delay: 0.05 + index * 0.04 }}
              className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xs"
            >
              <p className="text-caption-1-medium tracking-wide text-text-tertiary uppercase">
                {stat.label}
              </p>
              <p className="mt-1.5 text-title-2-semibold text-text-primary">{stat.value}</p>
              <Chip color={stat.color} variant="caption" className="mt-2">
                {stat.delta}
              </Chip>
            </motion.div>
          ))}
        </div>

        {/* Activity heat grid */}
        <motion.section
          initial={reduceMotion ? false : CARD_HIDDEN}
          animate={CARD_SHOWN}
          transition={{ ...CARD_TRANSITION, delay: 0.15 }}
          className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-semibold text-text-primary">Mentoring activity</h2>
            <span className="text-caption-1-regular text-text-tertiary">Last 26 weeks</span>
          </div>

          <Divider className="my-4" />

          <div className="contributions-grid overflow-x-auto" data-accent="blue">
            <div
              className="grid w-max grid-flow-col gap-[3px]"
              style={{ gridTemplateRows: `repeat(${DAYS}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: WEEKS * DAYS }, (_, i) => {
                const week = Math.floor(i / DAYS)
                const day = i % DAYS
                const tier = tierFor(week, day)
                return (
                  <span
                    key={i}
                    data-tier={tier}
                    className="contribution-cell animate-cell-pop size-3 rounded-[3px]"
                    style={{ animationDelay: `${((week * 7 + day * 11) % 23) * 18}ms` }}
                  />
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-1.5 text-caption-1-regular text-text-tertiary">
            Less
            {[0, 1, 2, 3, 4, 5].map((tier) => (
              <span
                key={tier}
                data-tier={tier}
                className="contribution-cell size-3 rounded-[3px]"
              />
            ))}
            More
          </div>
        </motion.section>

        <p className="text-center text-caption-1-regular text-text-tertiary">
          Composed from free BoardUI components. The Pro AI profile template adds full chart cards
          — activate a Pro seat to install it.
        </p>
      </main>
    </div>
  )
}
