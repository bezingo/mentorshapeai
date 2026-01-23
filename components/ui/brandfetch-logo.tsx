'use client'

import * as React from 'react'
import Image from 'next/image'
import { getBrandfetchLogoUrl, type BrandfetchLogoOptions } from '@/lib/brandfetch'
import { cn } from '@/lib/utils'

export interface BrandfetchLogoProps
  extends Omit<BrandfetchLogoOptions, 'identifier'>,
    Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  /** Domain (e.g., 'nike.com'), Brand ID, ISIN, or Stock Ticker */
  identifier: string
  /** Alt text for the logo */
  alt?: string
  /** Width in pixels (for Next.js Image) */
  width?: number
  /** Height in pixels (for Next.js Image) */
  height?: number
  /** Use Next.js Image component (default: true) */
  useNextImage?: boolean
  /** Additional className */
  className?: string
}

/**
 * BrandfetchLogo Component
 * 
 * Displays a logo from Brandfetch API
 * 
 * @example
 * <BrandfetchLogo identifier="nike.com" width={100} height={100} alt="Nike logo" />
 * 
 * @example
 * <BrandfetchLogo 
 *   identifier="tesla.com" 
 *   type="logo" 
 *   theme="dark" 
 *   width={200} 
 *   height={60}
 *   alt="Tesla logo"
 * />
 */
export function BrandfetchLogo({
  identifier,
  type = 'icon',
  theme,
  w,
  h,
  fallback,
  alt,
  width,
  height,
  useNextImage = true,
  className,
  ...props
}: BrandfetchLogoProps) {
  const logoUrl = getBrandfetchLogoUrl({
    identifier,
    type,
    theme,
    w: w || width,
    h: h || height,
    fallback,
  })

  if (!logoUrl) {
    return null
  }

  const imgWidth = width || w || 100
  const imgHeight = height || h || 100
  const imgAlt = alt || `${identifier} logo`

  if (useNextImage) {
    return (
      <Image
        src={logoUrl}
        alt={imgAlt}
        width={imgWidth}
        height={imgHeight}
        className={cn('object-contain', className)}
        unoptimized // Brandfetch CDN handles optimization
        {...(props as React.ComponentProps<typeof Image>)}
      />
    )
  }

  return (
    <img
      src={logoUrl}
      alt={imgAlt}
      width={imgWidth}
      height={imgHeight}
      className={cn('object-contain', className)}
      {...props}
    />
  )
}

