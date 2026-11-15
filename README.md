# Bounce Adventure

An original Bounce-inspired Telegram Mini App, built phase by phase with Phaser 3, TypeScript, and Vite. All current artwork is drawn in code; no classic game assets are copied.

## Development

Requires Node.js 22.12+ (validated with Node 24) and npm.

```sh
npm ci
npm run dev
```

The dev server listens on port 5173. Run `npm run build` for type checking and a production build, `npm run typecheck` for types only, and `npm run preview` to serve the production output on port 4173.

In restricted cloud workspaces, use `npm --cache /tmp/bounce-npm-cache ci` if the default npm cache is not writable.

## Phase 1 — Foundation

- Responsive game screen with Phaser canvas scaling.
- Original Greenwood Valley landscape and red-ball character.
- Start, pause, and resume an idle-animation preview.
- Preview pauses when the tab is hidden.
- TypeScript checks and production build.

This phase is a scene preview, not a playable level. No credentials, backend, or Telegram bot are needed yet.

## Roadmap and agreed design

Classic-meets-modern visuals, original graphics, single-player first, and both touch and keyboard controls.

1. Foundation (current).
2. Ball movement, gravity, jumping, collisions, touch and keyboard input.
3. Maps, enemies, coins, and traps.
4. Levels, scoring, lives, rewards, and level selection.
5. Telegram identity and server-verified scores/leaderboards with Supabase. Never trust client-provided identity or scores.
6. Vercel deployment and launch via a Telegram bot.

Multiplayer is outside the initial scope. Telegram integration and deployment will require project-specific configuration in later phases.
