#!/usr/bin/env node
/**
 * Downloads HeroUI Pro React artifacts when a personal or CI token is present.
 * Set HEROUI_PRO_PERSONAL_TOKEN locally or HEROUI_AUTH_TOKEN in CI (same value).
 */
import { spawnSync } from 'node:child_process'

const token = process.env.HEROUI_AUTH_TOKEN || process.env.HEROUI_PRO_PERSONAL_TOKEN

if (!token) {
  console.log(
    '[heroui-pro] Skipped: set HEROUI_PRO_PERSONAL_TOKEN or HEROUI_AUTH_TOKEN, then re-run npm run heroui-pro:install'
  )
  process.exit(0)
}

const env = { ...process.env, HEROUI_AUTH_TOKEN: token }

const result = spawnSync('npx', ['heroui-pro@latest', 'install', 'react', '-y'], {
  stdio: 'inherit',
  shell: true,
  env,
})

process.exit(result.status ?? 1)
