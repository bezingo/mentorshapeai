'use client'

import { useState, useMemo } from 'react'
import { Globe, Search } from 'lucide-react'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import {
  COMMON_TIMEZONES,
  ALL_TIMEZONES,
  getTimezoneLabel,
  getDetectedTimezone,
  isValidTimezone,
} from '@/lib/utils/timezone'

interface TimezoneSelectorProps {
  value: string
  onChange: (timezone: string) => void
  label?: string
  showDetectedTimezone?: boolean
  className?: string
  disabled?: boolean
}

/**
 * Searchable timezone selector using common IANA timezones.
 * Organized by region with search functionality.
 */
export function TimezoneSelector({
  value,
  onChange,
  label,
  showDetectedTimezone = true,
  className,
  disabled = false,
}: TimezoneSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Get detected timezone
  const detectedTimezone = useMemo(() => getDetectedTimezone(), [])

  // Filter timezones based on search query
  const filteredTimezones = useMemo(() => {
    if (!searchQuery) {
      return COMMON_TIMEZONES
    }

    const query = searchQuery.toLowerCase()
    const result: Record<string, string[]> = {}

    for (const [region, timezones] of Object.entries(COMMON_TIMEZONES)) {
      const filtered = timezones.filter((tz) => {
        const label = getTimezoneLabel(tz).toLowerCase()
        const tzLower = tz.toLowerCase()
        return label.includes(query) || tzLower.includes(query)
      })

      if (filtered.length > 0) {
        result[region] = filtered
      }
    }

    return result as typeof COMMON_TIMEZONES
  }, [searchQuery])

  // Check if there are any results
  const hasResults = Object.values(filteredTimezones).some(
    (arr) => arr.length > 0
  )

  // Handle selection
  const handleSelect = (newValue: string | string[] | null) => {
    if (newValue && typeof newValue === 'string' && isValidTimezone(newValue)) {
      onChange(newValue)
    }
  }

  // Get display value
  const displayValue = value ? getTimezoneLabel(value) : ''

  return (
    <div className={className}>
      {label && (
        <Label className="mb-2">
          <Globe className="h-4 w-4" />
          {label}
        </Label>
      )}

      <Combobox
        value={value}
        onValueChange={handleSelect}
        disabled={disabled}
      >
        <ComboboxInput
          placeholder="Select timezone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
          disabled={disabled}
          showClear={!!searchQuery}
        />
        <ComboboxContent className="w-[400px]">
          <ComboboxList>
            <ComboboxEmpty>No timezones found</ComboboxEmpty>

            {/* Show detected timezone option */}
            {showDetectedTimezone && detectedTimezone && !searchQuery && (
              <ComboboxGroup>
                <ComboboxLabel>Detected Timezone</ComboboxLabel>
                <ComboboxItem value={detectedTimezone}>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {detectedTimezone.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getTimezoneLabel(detectedTimezone)}
                    </span>
                  </div>
                </ComboboxItem>
              </ComboboxGroup>
            )}

            {/* Show timezones by region */}
            {Object.entries(filteredTimezones).map(([region, timezones]) => (
              <ComboboxGroup key={region}>
                <ComboboxLabel>{region}</ComboboxLabel>
                {timezones.map((tz) => (
                  <ComboboxItem key={tz} value={tz}>
                    <div className="flex flex-col">
                      <span>{tz.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        {getTimezoneLabel(tz)}
                      </span>
                    </div>
                  </ComboboxItem>
                ))}
              </ComboboxGroup>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {/* Show current selection below if a value is selected */}
      {value && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Current: {displayValue}
        </p>
      )}
    </div>
  )
}
