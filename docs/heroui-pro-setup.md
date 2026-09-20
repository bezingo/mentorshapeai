# HeroUI Pro setup (Mentorshape)

HeroUI Pro extends `@heroui/react` with production components (Sidebar, Sheet, CellSwitch, etc.) used on `/journey` and `/dashboard/settings/billing`.

## Required secrets (never commit)

| Variable | Use |
|----------|-----|
| `HEROUI_PRO_PERSONAL_TOKEN` | Personal token from [HeroUI dashboard](https://heroui.pro/dashboard) |
| `HEROUI_AUTH_TOKEN` | Same value for CLI, CI, and `npm install` artifact download |

Map locally:

```bash
export HEROUI_AUTH_TOKEN="$HEROUI_PRO_PERSONAL_TOKEN"
```

## Install Pro artifacts

```bash
npm run heroui-pro:install
# or: npx heroui-pro@latest install react -y
```

`postinstall` runs the same flow when `HEROUI_AUTH_TOKEN` / `HEROUI_PRO_PERSONAL_TOKEN` is set (skipped in cloud agents without secrets).

After a successful install:

1. Uncomment in `app/globals.css`:

   ```css
   @import "@heroui-pro/react/css";
   ```

2. Rebuild — `next.config.ts` detects artifacts under `node_modules/@heroui-pro/react/dist` and aliases `@heroui-pro/react` to the real package (otherwise OSS fallbacks in `lib/heroui-pro/fallback.tsx`).

## HeroUI Pro MCP (Cursor)

Add server `https://mcp.heroui.pro/mcp` with the same token (server-only). Tools:

- `list_components`
- `get_docs`
- `get_theme_variables`

## CI (GitHub Actions / Vercel)

Set `HEROUI_AUTH_TOKEN` as a secret so `npm ci` downloads Pro artifacts. Without it, the app builds using OSS fallbacks but Pro CSS and premium styling are missing until someone runs install locally.

## Manual follow-up (Hassanain)

If the cloud agent could not download Pro artifacts:

1. Add `HEROUI_PRO_PERSONAL_TOKEN` to `.env.local` and Vercel.
2. Run `npm run heroui-pro:install`.
3. Uncomment `@heroui-pro/react/css` in `globals.css`.
4. Configure Pro MCP + verify `/journey` sidebar and mobile artifact sheet.
