# Brandfetch Logo API Usage

This project uses [Brandfetch Logo API](https://developers.brandfetch.com/reference/logo-api) for displaying company and organization logos throughout the application.

## Setup

Environment variables are already configured in `.env.local`:
- `BRANDFETCH_CLIENT_ID` - Required for CDN requests
- `BRANDFETCH_API_KEY` - Available for future API features

## Usage

### React Component (Recommended)

Use the `BrandfetchLogo` component for React/Next.js:

```tsx
import { BrandfetchLogo } from '@/components/ui/brandfetch-logo'

// Basic usage
<BrandfetchLogo identifier="nike.com" width={100} height={100} alt="Nike logo" />

// With theme and type
<BrandfetchLogo 
  identifier="tesla.com" 
  type="logo"           // 'icon' | 'logo' | 'symbol'
  theme="dark"          // 'light' | 'dark'
  width={200} 
  height={60}
  alt="Tesla logo"
/>

// For organizations
<BrandfetchLogo 
  identifier="google.com" 
  type="icon"
  width={48}
  height={48}
  alt="Google"
  className="rounded-lg"
/>
```

### Direct URL Generation

For non-React contexts or when you need just the URL:

```tsx
import { getBrandfetchLogoUrl, getCompanyLogoUrl } from '@/lib/brandfetch'

// Simple domain lookup
const logoUrl = getCompanyLogoUrl('nike.com')
// Returns: https://cdn.brandfetch.io/nike.com?c=CLIENT_ID

// Full configuration
const logoUrl = getBrandfetchLogoUrl({
  identifier: 'tesla.com',
  type: 'logo',
  theme: 'dark',
  w: 400,
  h: 400,
  fallback: 'transparent'
})

// Use in img tag or background-image
<img src={logoUrl} alt="Company logo" />
```

### Organization Logos

For organization profiles, use the helper function:

```tsx
import { getOrganizationLogoUrl } from '@/lib/brandfetch'

// If you have the domain
const logoUrl = getOrganizationLogoUrl('stanford.edu', { type: 'logo' })

// If you only have the name (fallback)
const logoUrl = getOrganizationLogoUrl('Stanford University', { type: 'icon' })
```

## Logo Types

- **`icon`** (default): Social media icon, usually square, best for avatars and small displays
- **`logo`**: Horizontal logo, best for headers and large displays
- **`symbol`**: Abstract brand mark, best for favicons and minimal contexts

## Themes

- **`light`**: Use on dark backgrounds
- **`dark`**: Use on light backgrounds
- **No theme**: Default logo (usually works on both)

## Best Practices

1. **Always use Brandfetch** - Never hardcode logo URLs or use placeholder images
2. **Store domains** - When storing organization data, include the domain for accurate logo retrieval
3. **Choose appropriate type** - Use `icon` for small displays, `logo` for headers
4. **Provide alt text** - Always include descriptive alt text for accessibility
5. **Handle missing logos** - Brandfetch will return a fallback if logo not found

## Examples in Codebase

### Organization Profile Display

```tsx
// In organization profile component
<BrandfetchLogo 
  identifier={organization.domain || organization.name}
  type="logo"
  width={120}
  height={40}
  alt={`${organization.name} logo`}
/>
```

### Work Experience Company Logo

```tsx
// In work experience card
<BrandfetchLogo 
  identifier={experience.company_domain || experience.company}
  type="icon"
  width={32}
  height={32}
  alt={`${experience.company} logo`}
  className="rounded"
/>
```

### Education Institution Logo

```tsx
// In education section
<BrandfetchLogo 
  identifier={education.institution_domain || education.institution}
  type="symbol"
  width={48}
  height={48}
  alt={`${education.institution} logo`}
/>
```

## API Reference

See `lib/brandfetch.ts` for full function signatures and TypeScript types.

## Documentation

- [Brandfetch Logo API Docs](https://developers.brandfetch.com/reference/logo-api)
- [Brandfetch Developer Portal](https://developers.brandfetch.com/)


