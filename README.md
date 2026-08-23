# London Tycoon

A browser-based London property game for 2–4 local or online players. The game runs as a Cloudflare Worker, uses D1 for online rooms, and is published from GitHub.

## Safe update workflow

1. Create a branch from `main`.
2. Make and commit the change on that branch.
3. Push the branch and open a pull request.
4. Check the Cloudflare branch preview and the automated build before merging.
5. Merge into `main` only after the preview plays correctly. Cloudflare then deploys `main` to production.

Production: <https://london-tycoon.pages.dev>

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Run the same verification used before deployment:

```bash
npm test
```

## Cloudflare Builds settings

- Production branch: `main`
- Build command: `npm run build`
- Production deploy command: `npm run cloudflare:deploy`
- Preview deploy command: `npm run cloudflare:preview`
- Root directory: `/`
- Non-production branch builds: enabled

The preparation script converts vinext's generated Worker configuration to the existing `london-tycoon` Worker and D1 database. The database identifier is configuration, not a secret. Cloudflare authentication stays in Cloudflare Builds and is never committed to this repository.

## Project structure

- `app/page.tsx` — game state and rules
- `app/game-board.tsx` — board rendering
- `app/game-map-data.ts` — route geometry and station mapping
- `app/game-board.css` — board-only visual system
- `app/api/rooms/route.ts` — online room API
- `scripts/prepare-cloudflare-deploy.mjs` — generated Worker deployment configuration
- `tests/` — production build and board structure checks
