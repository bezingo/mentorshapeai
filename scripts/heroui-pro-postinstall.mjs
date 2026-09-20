#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const token = process.env.HEROUI_AUTH_TOKEN || process.env.HEROUI_PRO_PERSONAL_TOKEN
if (!token) {
  process.exit(0)
}

const script = join(dirname(fileURLToPath(import.meta.url)), 'heroui-pro-install.mjs')
spawnSync(process.execPath, [script], { stdio: 'inherit' })
