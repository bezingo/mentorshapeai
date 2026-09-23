import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Ensures webhook and cron API paths stay public in Clerk middleware.
 */
describe('middleware public routes', () => {
  it('includes Zoom webhooks and cron paths', () => {
    const source = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8')
    expect(source).toMatch(/\/api\/webhooks\/\(\.\*\)/)
    expect(source).toMatch(/\/api\/cron\/\(\.\*\)/)
    expect(source).toMatch(/\/api\/mentor\/calendar\/webhook/)
  })
})
