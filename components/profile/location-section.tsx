'use client'

import { useState, useEffect } from 'react'
import { ProfileSection } from './profile-section'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocationSectionProps {
  country: string | null
  city: string | null
  onSave: (data: { country: string | null; city: string | null }) => Promise<void>
  className?: string
}

// ISO countries list
const COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Belgium',
  'Brazil',
  'Bulgaria',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Croatia',
  'Cuba',
  'Czech Republic',
  'Denmark',
  'Egypt',
  'Estonia',
  'Ethiopia',
  'Finland',
  'France',
  'Germany',
  'Ghana',
  'Greece',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kuwait',
  'Lebanon',
  'Libya',
  'Lithuania',
  'Malaysia',
  'Mexico',
  'Morocco',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Oman',
  'Pakistan',
  'Palestine',
  'Panama',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Saudi Arabia',
  'Serbia',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'South Africa',
  'South Korea',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Thailand',
  'Tunisia',
  'Turkey',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
]

export function LocationSection({ country, city, onSave, className }: LocationSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(country || '')
  const [selectedCity, setSelectedCity] = useState(city || '')

  // Reset form when props change
  useEffect(() => {
    setSelectedCountry(country || '')
    setSelectedCity(city || '')
  }, [country, city])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        country: selectedCountry || null,
        city: selectedCity || null,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedCountry(country || '')
    setSelectedCity(city || '')
  }

  const locationDisplay =
    country && city ? `${city}, ${country}` : country || city || 'Not set'

  const viewContent = (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      {country || city ? (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
            'bg-primary/10 text-primary'
          )}
        >
          {locationDisplay}
        </span>
      ) : (
        <span className="text-muted-foreground">Not set</span>
      )}
    </div>
  )

  const editContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger id="country" className="w-full">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            placeholder="Enter city name"
          />
        </div>
      </div>
    </div>
  )

  return (
    <ProfileSection
      title="Location"
      viewContent={viewContent}
      editContent={editContent}
      isEditing={isEditing}
      onEditingChange={setIsEditing}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
      className={className}
    />
  )
}
