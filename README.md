# Bounce Adventure

An original Bounce-inspired platform game for a future Telegram Mini App, built with Phaser 3, TypeScript, and Vite. All current artwork is drawn in code.

## Run and build

Requires Node.js 22.12+ (validated with Node 24) and npm.

```sh
npm ci
npm run dev
```

Vite serves the game on port 5173. `npm run build` checks TypeScript and writes the production game to `dist`. `npm run preview` serves that build on port 4173. Phaser currently produces a bundle-size advisory; the build succeeds.

In restricted cloud workspaces, use `npm --cache /tmp/bounce-npm-cache ci` if the default cache is not writable.

## Playable alpha — Phases 1–4

- Original red-ball character and three scrolling worlds with increasing difficulty.
- Gravity, platform collisions, jumping, a short jump buffer and edge-jump grace period.
- Keyboard: arrows / A D to move; Space / W / up arrow to jump.
- Mobile: hold a direction and tap Jump; simultaneous touch input is supported.
- Coins (10 points), level completion (100 points), patrol enemies, spikes, and gaps.
- Three lives per run, respawning, game over, restart, pause/resume, and automatic pause when backgrounded.
- Completing a level unlocks the next; unlocked levels and best completed-level score persist on this browser when storage is available.
- Level selector for unlocked worlds. Restarting or selecting a level resets the run score and lives.

Scores and unlocks are local and editable by the device owner. They are not an authenticated online leaderboard. Telegram identity and server-side scores are not implemented yet.

## Automated checks

```sh
npm run build
npx playwright install chromium
npm run test:e2e
```

If Chromium is already installed, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` instead of downloading a browser. The Playwright runner starts its own Vite server on port 5174.

The three browser tests cover keyboard movement, fast jump taps, pause, scoring, damage, respawn, game over, restart, all level-completion transitions, local persistence, simultaneous mobile touch, cancellation, background pause, and four screen sizes. For deterministic overlap tests, the ball is positioned near coins, enemies, hazards, and flags: these checks do **not** demonstrate a complete human traversal of every level. GitHub Actions runs the build and browser suite on pushes and pull requests.

## First hands-on test — do this now

Use the deployed Vercel URL, or run the game with the instructions above. Test on a phone and on a desktop browser:

1. Start Greenwood Valley. Move both ways and try short jump taps while moving.
2. Jump over spikes and gaps, avoid enemies, collect coins, and reach the flag.
3. Play all three levels. Check that jumps feel fair and every flag is reachable.
4. Take damage, lose all lives, and restart. Pause mid-jump and switch apps/tabs.
5. Reload after completing a level: its unlock and your best score should remain on that browser.

Report the device/browser, level, and obstacle for any issue. Phone feel and full level traversal need human feedback before tuning or adding the online systems.

## Hosting and Telegram launch

For an existing Vercel project, connect this GitHub repository and select Vite, build command `npm run build`, output directory `dist`, and Node 24. No environment variables are required for this playable alpha. If automatic GitHub deployment is already connected to `main`, a push should trigger it; check the deployment result in Vercel. A successful Git push does not verify deployment.

The public HTTPS deployment must be tested before configuring it as the Mini App URL for your bot through BotFather. No bot credentials should be committed or entered into chat.

## Remaining phases

5. Telegram integration, verified player profiles, and server-validated score submissions/leaderboards with Supabase. Client-provided Telegram user fields and scores must not be trusted by a leaderboard backend.
6. Verify Vercel production deployment and launch from the Telegram bot, including real-device Telegram testing.

Agreed design: classic-meets-modern visuals, original graphics, single-player first, both touch and keyboard controls. Multiplayer is outside the initial scope.
