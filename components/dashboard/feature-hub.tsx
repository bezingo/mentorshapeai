'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import {
  RiAddLine,
  RiArrowRightLine,
  RiCalendarLine,
  RiFlagLine,
  RiGiftLine,
  RiGraduationCapLine,
  RiGroupLine,
  RiSettings3Line,
  RiTimeLine,
  RiUserLine,
} from '@remixicon/react'
import { cx } from '@/utils/cx'

/**
 * Feature hub cards on /dashboard, BoardUI-styled.
 *
 * The server page resolves roles and passes serializable feature data; icons
 * are referenced by name and resolved here so component references never
 * cross the server/client boundary.
 */

export type FeatureIconName =
  | 'target'
  | 'users'
  | 'calendar'
  | 'user'
  | 'settings'
  | 'clock'
  | 'package'
  | 'graduation'
  | 'plus'

const ICONS: Record<FeatureIconName, React.ComponentType<{ className?: string }>> = {
  target: RiFlagLine,
  users: RiGroupLine,
  calendar: RiCalendarLine,
  user: RiUserLine,
  settings: RiSettings3Line,
  clock: RiTimeLine,
  package: RiGiftLine,
  graduation: RiGraduationCapLine,
  plus: RiAddLine,
}

export interface FeatureLinkData {
  label: string
  href: string
  icon: FeatureIconName
}

export interface FeatureCardData {
  title: string
  description: string
  icon: FeatureIconName
  links: FeatureLinkData[]
}

// BoardUI entrance: condense into place from opacity-0 / scale-95 / blur(2px).
const CARD_HIDDEN = { opacity: 0, scale: 0.95, filter: 'blur(2px)' }
const CARD_SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const CARD_TRANSITION_BASE = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const

function FeatureHubCard({ feature, index }: { feature: FeatureCardData; index: number }) {
  const reduceMotion = useReducedMotion()
  const Icon = ICONS[feature.icon]

  return (
    <motion.div
      initial={reduceMotion ? false : CARD_HIDDEN}
      animate={CARD_SHOWN}
      transition={{ ...CARD_TRANSITION_BASE, delay: index * 0.04 }}
      className="flex flex-col rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-shadow duration-150 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-button-ghost-background text-button-ghost-foreground">
          <Icon className="size-5" />
        </span>
        <h2 className="text-headline-semibold text-text-primary">{feature.title}</h2>
      </div>
      <p className="mt-3 text-body-regular text-text-secondary">{feature.description}</p>

      <div className="mt-auto space-y-2 pt-5">
        {feature.links.map((link) => {
          const LinkIcon = ICONS[link.icon]
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                'group flex items-center justify-between rounded-xl border border-border-button-default bg-background-primary-default px-3 py-2',
                'text-body-medium text-text-primary shadow-xs transition-colors duration-150',
                'hover:bg-background-primary-hover active:bg-background-primary-active',
                'focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none'
              )}
            >
              <span className="flex items-center gap-2">
                <LinkIcon className="size-4 text-foreground-icon-secondary" />
                {link.label}
              </span>
              <RiArrowRightLine className="size-4 text-foreground-icon-tertiary transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}

export function FeatureHub({ features }: { features: FeatureCardData[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature, index) => (
        <FeatureHubCard key={feature.title} feature={feature} index={index} />
      ))}
    </div>
  )
}
