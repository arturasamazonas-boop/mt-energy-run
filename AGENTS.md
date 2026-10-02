# Project continuity

Canonical remote: https://github.com/arturasamazonas-boop/mt-energy-run (private). This project is fully separate from `penktas-gurksnis` – do not share code, services or databases.

- Purpose: birthday surprise (October 24) for the MT GROUP founder Mindaugas; ~250 employees compete on a shared leaderboard. Hero = friendly cartoon of him in a navy suit, white shirt, patterned pocket square and yellow MT helmet.
- Start from the latest remote `main`.
- After changes run `npm run check` and `npm test` (set `TEST_DATABASE_URL` to also test PostgreSQL). Report untested visual behaviour honestly; physical phone testing has not been done by the agent.
- Gameplay rules live in `shared/` and are used by both browser and server. Any change to physics, scoring or world generation must keep `test/feasibility.mjs` green (the look-ahead bot must survive generated courses) and keep server validation (`server/rules.mjs`) in sync.
- Review art via `/dev/preview.html?view=character|outfits|face|landmarks` and gameplay via `/?debug&practice&autoplay&city=N`.
- Never commit credentials, `.env`, `node_modules` or the founder's reference photos.
- User communicates in Lithuanian; UI is LT + EN.
