# AGENTS.md — هم‌قدم (in-person shopping assistant)

This file is the full orientation for any AI session working in this repo. Read it before touching anything. `plan.md` is the approved product plan (source of truth for intent); this file explains how the implementation works and what must not be broken.

## 1. What this project is

**هم‌قدم** ("before you leave, be sure") — a Persian/RTL, mobile-first **visit planner**, not a marketplace. Built for the Torob hackathon challenge (`challange.md`, criteria in Persian: product 75 / UX 75 / intelligence 50 / deploy 40 / technical 40 / dataset 20 of 300).

The loop: buyer describes what they want in free Persian text → agent parses a structured intent → searches the Torob dataset → shows ranked store offers that **separate recorded price from confirmed stock** → agent shortlists 3 shops and sends inquiries → a store owner answers in free text (demo inbox) → agent parses the reply, follows up when incomplete, finds alternatives when out of stock → builds a visit plan (primary shop, fallback, checklist, Google Maps route).

The core bet: the hard part of in-person buying in Tehran is not search, it is knowing whether the trip is worth it. A recorded offer ≠ stock on the shelf. Data honesty is the differentiator.

**Tagline:** قبل از رفتن، مطمئن شو.

## 2. Current state

- Fully implemented and verified in this repo: app, DB build, agent loop, owner inbox, Docker image, smoke + walkthrough tests.
- `npm run typecheck` and `npm run build` pass. `npm run smoke` passes against the Docker image.
- **Not a git repository** (never initialized; `.gitignore` exists and matters for deploy).
- **Remaining:** Liara VPS deployment (owner has no credentials in sessions; instructions in `DEPLOY.md`). The 5-minute demo video was explicitly **skipped by the owner** — do not build recording tooling; `demo-script.md` is a shot list they may use.

## 3. Repo map

| Path | Role |
|---|---|
| `challange.md` | Original challenge + dataset caveats (Persian). Fake shop names/phones are documented here. |
| `plan.md` | Approved full plan: intent, screens, truthfulness model, agent design, data seed, schedule, scoring map, definition of done. |
| `README.md` | Quick start, demo flow, scripts. |
| `DEPLOY.md` | Docker + Liara deployment, env vars, post-deploy checks. |
| `demo-script.md` | 5-minute video shot list (presenter uses this; no video was recorded). |
| `app/` | Next.js 16 App Router. Pages: `/` home, `/results`, `/ask/[runId]`, `/plan/[runId]`, `/store` + `/store/[shopId]`, `/data` (transparency sheet). API routes: `intent`, `search`, `confirmations` (+GET by runId), `owner/reply`, `owner/threads`, `visit-plan`, `health`, `demo/reset`. |
| `components/` | `HomeClient`, `ResultsClient`, `AskClient`, `OwnerInbox`, `ShareButton`, `PlanMap`, `MapPanel` (Leaflet), `Header`, `StatusChip`, `Price`. |
| `lib/` | `types.ts` (shared contracts), `db.ts` (better-sqlite3 singleton), `search.ts` (FTS + filters + alternatives), `rank.ts` (scoring + reasons), `hours.ts` (+ `clock.ts`), `agent.ts` (orchestration), `intent.ts` (LLM + fallback parser), `owner-parse.ts`, `llm.ts` (DeepSeek client), `format.ts` (Persian digits/Toman/relative time/owner parsers), `demo.ts` (seed constants), `types.ts`. |
| `scripts/build_db.py` | Streams `torob-dataset/*.csv` → `data/torob.db` (~16 s, 281 MB). Destroys and rebuilds; wipes messages. |
| `scripts/smoke.mjs` | HTTP smoke test against a base URL: health → intent → search → start run → owner reply → visit plan. |
| `scripts/e2e.mjs` | Puppeteer walkthrough (needs `/usr/bin/google-chrome`), writes screenshots to `/tmp/hamqadam-*.png`. |
| `ux/tokens.css` | Tailwind v4 `@theme` design tokens. Imported by `app/globals.css`. Kept in sync with the app's look. |
| `fordi-skill/` | Persian/RTL design skill. `rules/persian-rtl.md` and `rules/design.md` are **normative** for UI work. The full idea→direction→flows→refs pipeline was documented in `plan.md` but the stages were not all executed; the rules were applied directly. |
| `torob-dataset/` | Challenge dataset CSVs (`shops.csv`, `products.csv`, `offers.csv`) with `README.txt`. |
| `data/torob.db` | Built artifact, **gitignored** (281 MB). Required for dev and included in the Docker image via Next standalone file tracing. |
| `Dockerfile`, `.dockerignore`, `liara.json`, `.env.example` | Deployment. |
| `dataset/` | Old copy of the dataset (superseded by `torob-dataset/`; ignore it). |

## 4. Commands

```bash
npm install                      # deps (already installed here)
python3 scripts/build_db.py      # rebuild DB (destroys messages/runs)  — also: npm run db
npm run dev -- --port 3010       # dev server (port 3000 was occupied on this machine)
npm run typecheck                # tsc --noEmit (also: npm test)
npm run build                    # production build (output: standalone)
npm run smoke -- http://localhost:3012   # HTTP smoke against a running server
npm run e2e                      # browser walkthrough; writes /tmp/hamqadam-*.png
```

Docker demo (image is built already; container name `hamqadam-test`, port 3012):

```bash
docker build -t hamqadam:local .
set -a && . ./.env.local && set +a
docker run -d --name hamqadam-test -p 3012:3000 \
  -e DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  -e DEEPSEEK_BASE_URL="$DEEPSEEK_BASE_URL" \
  -e DEEPSEEK_MODEL="$DEEPSEEK_MODEL" \
  -e DEMO_NOW="2026-10-21T18:00:00+03:30" \
  hamqadam:local
curl -X POST http://localhost:3012/api/demo/reset   # clean demo state
```

375px rule check (for UI changes): at viewport width 375 require
`document.documentElement.scrollWidth === innerWidth`, no button with
`scrollWidth > clientWidth + 1`, targets ≥ 44px. `scripts/e2e.mjs` demonstrates the same check.

## 5. Environment and secrets

`.env.local` (gitignored, **never print, commit, or echo the key**):

```
DEEPSEEK_API_KEY=<owner-provided DeepSeek key>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DB_PATH=/app/data/torob.db        # used by Docker; local default is <repo>/data/torob.db
DEMO_NOW=                         # optional; freezes only the shop-hours clock for recording
```

LLM is used for intent parsing and owner-reply parsing. Without a key everything still works through deterministic fallbacks (`lib/intent.ts`, `lib/owner-parse.ts`); `/api/health` reports `llm: false`. Do not make the demo depend on LLM availability: 8s timeout, one retry, regex fallback, then graceful degradation.

## 6. Data layer facts

- Source: `torob-dataset/` — 6,476 shops / 225,903 products / 331,506 offers. Prices are ~1–2 weeks stale; `offers.last_price_changed_at` is per offer.
- Dataset caveats (from `challange.md`, surfaced to users at `/data`): 6,364 of 6,476 shop names are synthetic; **all phone numbers are fake** (never rendered as callable); 112 shops have a real website/Instagram; geographic sample is ~10% of Tehran shops, concentrated around Ferdowsi/Sheikh Hadi; a shop's category list is **not** proof a product exists — only an offer links shop↔product; `payment_options` only declared for 266 shops; `weekly_hours` for 4,473.
- Hidden facts are explained in-app at `/data`; missing info must render as «نامشخص», never as "no".
- `lib/search.ts` search strategy: normalize (Arabic→Persian chars, Persian→Latin digits, ZWNJ→space, lowercase); FTS5 must-match attempts (model tokens = latin/storage numbers, + brand, + descriptors like «مردانه»/«مدرن») → all tokens → OR → LIKE; accessory-title penalty; budget filter; area filter (default «فردوسی و شیخ هادی»)
- Ranking (`lib/rank.ts`): stock confirmation .30 / price .25 / distance .15 / hours .12 / payment .10 / warranty .08; max 2 plain-Persian reasons per card; confirmed offers always float to top.
- Budget filter counts: the S25 FE demo shows 33 recorded offers, 28 within the 200M budget — the UI says «۲۸ فروشگاه در بودجه · از ۳۳ قیمت ثبت‌شده». Do not regress this wording.
- Alternative finding (`searchAlternatives`) tries sibling products via FTS on brand/model and returns ranked offers excluding already-asked shops, honoring budget.
- Hours (`lib/hours.ts`): parses `weekly_hours` (status closed/unsupported/declared, zero-length shifts ignored); state open/closed/unknown with Persian labels; **uses `lib/clock.ts` `demoNow()` so `DEMO_NOW` freezes hours** (timestamps in messages/confirmations still use real time).

## 7. Truthfulness model — never break these rules

| Field | Values | UI |
|---|---|---|
| priceStatus | recorded / confirmed / changed | «ثبت‌شده ۹ روز پیش» / «تأیید فروشنده …» |
| stockStatus | unknown / confirmed / unavailable / ambiguous | «موجودی نامشخص» until an owner confirms |
| hoursStatus | open / closed / unknown | never claim open when hours are missing |
| paymentStatus | declared providers / unknown | absence of data ≠ "no" |
| source | dataset / owner | every claim is traceable |

- Only an owner reply sets stock `confirmed`, always with a timestamp.
- Owner price change: confirmed price shown, recorded price still visible.
- An owner offering a different storage size (e.g., asked 256, owner says 128 available) is treated as **unavailable for the requested variant** + alternative info, and triggers the next-shop inquiry — not a confirmation.
- A confirmed reply missing price/hours triggers one targeted agent follow-up («قیمت روز و ساعت کاری امروز را هم می‌فرمایید؟»).

## 8. Agent loop (lib/agent.ts)

```
startRun(intent, productId)
  → shortlist 3: cheapest + nearest + payment-enabled (filtered to open shops when deadline=today)
  → insert confirmations (status pending) + buyer inquiry messages + agent_events
ownerReply(threadId, text)
  → parseOwnerReply (LLM → regex fallback)
  → available=true → confirmed (price/hours stored; follow-up if price/hours missing)
  → available=false → unavailable + nextInquiry() adds the next-best shop
  → null → ambiguous + agent follow-up message
  → alternative storage mismatch → unavailable + «فقط X گیگ دارد» event
buildVisitPlan(runId)
  → primary = first confirmed (best score), else best open pending
  → fallback = cheapest **open** among remaining confirmed/pending/alternatives
  → WhatsApp share text + checklist (lib/demo.ts CHECKLIST)
```

Guardrails: max 8 agent steps, 3 shops per round, 6 threads max, 8s LLM timeout ×2 fallback layers, owner text capped at 1200 chars, everything logged to `agent_events` and rendered as a plain-Persian timeline (never raw logs). Buyer UI polls `/api/confirmations?runId=` every 1.5 s.

## 9. Demo seed (memorize these IDs)

From `lib/demo.ts`:

- Hero product: `product_6c62d575e3d247f6f29e051a` — «گوشی سامسونگ (ویتنام) S25 FE 5G | حافظه 256 رم 8 گیگابایت», 34 offers / 33 priced, cluster in Ferdowsi/Sheikh Hadi.
- Alternative product: `product_f07ef205504b7ab37b60b509` — S25 FE India variant, 188.8M at نیینا نیان.
- Shops (with roles and owner replies in `DEMO_SHOPS`): نویار آذروش (cheapest, closed Friday-origin hours), نی‌آرا آروان (in-budget, plays out-of-stock), رووان مهرآرا (primary confirmation 184.6M), آذرنوش رویس (nearest), رویار نیک‌نوش, مانان مانینا, آروان دیسین (the payment-filter shop: تارا/ازکی‌وام), نیینا نیان.
- Verified happy path with `DEMO_NOW=2026-10-21T18:00:00+03:30`: shortlist = نویار/آذرنوش/نی‌آرا → owner tells نی‌آرا «این مدل ۲۵۶ تموم شده.» → agent asks رووان → owner confirms «هست ۱۸۴٬۶۰۰٬۰۰۰ تومان. تا ۹ شب. گارانتی ۱۸ ماه.» → visit plan: primary رووان مهرآرا, fallback نویار آذروش.
- `«تا ۹ شب»` must parse to `21:00`; Persian-digit prices must parse (`parseToman`, `parseClosingTime`, `parseWarrantyMonths` in `lib/format.ts` — covered implicitly by smoke/e2e, not unit tests).
- Payment-filter demo: 2 shops declare credit payment for the hero product, both above budget; the agent says so instead of hiding it.

## 10. UI conventions (hard rules from fordi, already applied)

- Persian UI everywhere, `dir="rtl"`, `lang="fa"`. UI copy in Persian; code/identifiers in English.
- Persian digits in UI, **never `tabular-nums`** on them (hard error in fordi; grep for regressions).
- Tailwind **logical utilities only**: `ms- me- ps- pe- start- end- text-start text-end border-s rounded-s`. Never `ml- mr- pl- pr- left- right- text-left text-right`.
- 375px-first: single-line control rows, `min-h-11` + `whitespace-nowrap` buttons, no horizontal overflow, nothing hidden under the keyboard.
- One icon library: Lucide. No emoji as icons, no gradient text, no glass/blur decoration, no eyebrow labels above headings (see `fordi-skill/rules/design.md` refuse list).
- Design tokens: `ux/tokens.css` (`@theme`: paper bg `#f4f1ea`, accent green `#0b6b53`, ink `#16211b`, warning `#9a5700`, danger `#b42318`, radii, `shadow-card`, `animate-stamp`). Imported once in `app/globals.css`; do not hardcode other hexes in components.
- Font: self-hosted `public/fonts/Vazirmatn.woff2` via `next/font/local` in `app/layout.tsx` — **do not switch to `next/font/google`** (build-time network dependency is a deploy risk on Liara).
- Dates in UI are relative or Persian; Toman everywhere with `formatToman` (one decimal under a billion: ۱۸۴٫۶ میلیون تومان).
- Map: Leaflet + OpenStreetMap tiles, `MapPanel` dynamically imported with `ssr:false`, OSM attribution kept.

## 11. Deployment (Docker / Liara) — gotchas baked into the current setup

- Multi-stage Dockerfile on `node:22-slim`. The **deps stage installs `python3 make g++`** because `better-sqlite3` has no prebuilt binary for this Node patch version and compiles via node-gyp.
- `output: "standalone"`. Next's file tracing **already includes `data/torob.db`** in `.next/standalone/data` — the Dockerfile deliberately does not copy `data/` again (that would double the image to ~900MB). Image ≈ 598 MB.
- `serverExternalPackages: ["better-sqlite3"]` is required in `next.config.ts`.
- `npm start` (`next start`) prints a warning with `output: standalone`; it still served in tests. For production prefer the Docker image or `node .next/standalone/server.js`.
- `liara.json`: app `hamqadam`, platform docker, port 3000. Deploy **from this folder** with the Liara CLI so the gitignored `data/torob.db` is in the build context (or commit the DB / build it in a stage — see `DEPLOY.md`). Do not mount an empty volume over `/app/data`.
- Post-deploy: `curl /api/health` → `{"ok":true,"shops":6476,"products":225903,"offers":331506,"llm":true}`; then `npm run smoke -- https://<domain>`; then `POST /api/demo/reset`.
- The container FS is writable; messages/confirmations live in the SQLite file and may reset on restart. Fine for the demo.

## 12. Decisions already made (do not relitigate without a reason)

- Working name **هم‌قدم**; hero purchase **Samsung S25 FE 256/8 in Ferdowsi/Sheikh Hadi**; second act is a watch (category switch keeps budget/area/payment).
- Owner inbox is a **labeled demo panel** (`/store`, no login, «دمو» badge); its message API is shaped so WhatsApp Business could replace it. Owner-replies are arbitrary free text — never canned-only.
- No checkout, no delivery, no user accounts, no real phone calls, no scraping. Payment filter is **off by default** and always shows its scarcity.
- Deterministic orchestration + LLM only at language edges (reliability under demo pressure).
- SQLite over Vercel/serverless (dataset size + message writes need a real disk → Liara Docker).
- Video: skipped by owner decision (`demo-script.md` remains as documentation).

## 13. Working protocol for agents in this repo

1. Before product-affecting changes, read `plan.md` (intent, screens, scoring map). Keep `plan.md` §0 status accurate if scope changes.
2. Never fabricate data beyond the documented demo suspects (owner replies are the only "live" surface, and they are labeled as a demo integration).
3. After any change: `npm run typecheck && npm run build`; run `npm run smoke` against a running server; for UI changes run the 375px check and `grep -rnE '\b(ml-|mr-|pl-|pr-|text-left|text-right)\b' app components` (must be empty); screenshot-review at 390×844 with `scripts/e2e.mjs` + `Read` the PNGs.
4. Keep components typed by `lib/types.ts`; API shapes in `plan.md` §6 are the integration contract — changing them means updating every consumer.
5. Don't commit, push, or initialize git unless the owner asks. Never print or move the DeepSeek key outside `.env.local`.
6. Leftover state after testing: `POST /api/demo/reset` (or the «بازنشانی» button in `/store`), and stop background servers you started.
