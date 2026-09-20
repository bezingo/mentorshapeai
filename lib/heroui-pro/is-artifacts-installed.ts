import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** True when `heroui-pro install` has populated @heroui-pro/react dist (beyond postinstall stub). */
export function isHeroUIProArtifactsInstalled(cwd = process.cwd()): boolean {
  const distPath = join(cwd, 'node_modules/@heroui-pro/react/dist')
  if (!existsSync(distPath)) return false
  try {
    return readdirSync(distPath).some((entry) => entry !== 'postinstall')
  } catch {
    return false
  }
}
