# هم‌قدم — Build Plan

> Working name: **هم‌قدم** · Tagline: **قبل از رفتن، مطمئن شو.**
> Status: approved and implemented in this repo. The app, SQLite dataset, agent loop, owner inbox, Docker image and smoke tests are working. The only open item is the Liara deployment; the demo storyboard is in `demo-script.md` for the presenter.

## 0. Built and verified

- `npm run typecheck` and `npm run build` pass.
- `npm run smoke -- http://localhost:3012` passes against the Docker image.
- Playwright/Puppeteer walkthrough reaches home → results → ask → owner reply → visit plan at 375px with no horizontal overflow.
- Docker image: `hamqadam:local`, 598 MB, healthy.
- Dataset: 6,476 shops / 225,903 products / 331,506 offers.
- Owner inbox: arbitrary free-text replies update the buyer run in about two seconds.
- Remaining: push the image to Liara and set env vars. Video recording is left to the presenter; `demo-script.md` has the shot list.

## 1. The bet

The challenge is not "build another product search". Torob already has search and prices. The gap is the last mile: a person has decided to buy in person, and needs to know whether the trip is worth it.

**هم‌قدم is a visit planner, not a marketplace.**

It answers five questions in one place:

1. Which exact variant do I want?
2. Which nearby shop is most likely to have it on the shelf right now?
3. What will it really cost, with warranty and payment terms?
4. Is the shop open when I can go?
5. If it is not there, where do I go instead?

The agent does the work a search page cannot: it asks the shop, reads the answer, follows up when the answer is incomplete, and re-plans when the item is unavailable.

## 2. User and jobs

**Primary user:** a 40+ "classic" buyer who prefers to see, touch and try the product before paying. They use a phone, Persian, and WhatsApp more than web dashboards. They will tolerate a small number of clear steps, not a blank chat box.

**Scene:** late afternoon in Tehran. The user wants a Samsung S25 FE 256 GB today, has a 200 million Toman budget, and is willing to go to Ferdowsi/Sheikh Hadi. They do not want to visit four passages and hear "تمام شده" three times.

**Main jobs:**

1. Turn a messy Persian sentence into an exact product, budget, area, payment preference and deadline.
2. Compare nearby shops with price, warranty, hours, distance and payment, with a reason for each recommendation.
3. Ask shops for current stock and price, follow up, and show what is confirmed versus only recorded.
4. Produce a visit plan with a primary shop, a fallback, route order, timing and a checklist.
5. Let the user switch product type, budget or area without restarting the conversation.
6. Give the store owner a lightweight way to answer an inquiry in free Persian text.

**Non-goals:** checkout, delivery, real payments, user accounts, full marketplace, scraping Instagram, real phone calls, review moderation.

**Anti-goals:** a chat-only interface; pretending stale prices are live; showing fake phone numbers as callable; ranking shops by unverified claims; hiding data gaps.

## 3. The five-minute demo

One continuous story, two browser tabs: the buyer app and the store-owner inbox.

| Time | Beat |
|---|---|
| 0:00 | The problem: one wasted trip, three "نداریم" answers. |
| 0:20 | The buyer types: «یه گوشی سامسونگ S25 FE ۲۵۶ می‌خوام، تا ۲۰۰ میلیون، امروز فردوسی، قسطی هم باشه خوبه.» |
| 0:35 | The intent bar appears: product, budget, area, payment, today. The user taps the category chip and sees that switching to «ساعت» keeps budget and area. Then switches back. |
| 1:00 | Results: 34 priced offers, nearby cluster, price range, cards with "why this shop", map. |
| 1:30 | The user taps «از ۳ فروشگاه بپرس». The agent shortlists cheapest + closest + payment-enabled, sends structured inquiries, and shows its activity. |
| 2:00 | Owner tab: the cheapest shop replies in free text: «این مدل ۲۵۶ تموم شده.» |
| 2:20 | The agent parses it, marks the offer unavailable, finds the real India-variant S25 FE 256 at 188.8M (نیینا نیان), and asks the next shop. |
| 2:50 | The nearest confirmed shop replies: «هست ۱۸۴٬۶۰۰٬۰۰۰، تا ۹ شب، گارانتی ۱۸ ماه.» The card flips to «تأیید فروشنده — همین حالا». |
| 3:20 | Visit plan: go to رووان مهرآرا before 21:00; fallback فران مانآرا; India-variant alternative at 188.8M if the first shop fails; checklist. |
| 4:00 | Payment filter: only two shops declare credit payment, both more expensive. The agent explains the tradeoff instead of hiding it. |
| 4:20 | Second category in 20 seconds: switch to «ساعت», same intent mechanics, results update in place. |
| 4:35 | Data honesty sheet: prices are recorded, stock is not; names/phones are demo data; shop category ≠ product availability. |
| 4:45 | Close: the live URL, the agent trace, and the one-line promise. |

## 4. Product

### 4.1 The intent object

The intent is always visible and editable. Chat edits it; cards and chips edit it too.

```ts
type Intent = {
  rawText: string
  category: 'phone' | 'watch' | 'lighting' | 'home' | 'tools' | 'other'
  brand?: string
  model?: string
  variant?: {
    storageGb?: number
    ramGb?: number
    color?: string
    condition?: 'new' | 'used' | 'stock'
    connectivity?: string
  }
  budgetMaxToman?: number
  area: { label: string; lat?: number; lon?: number; radiusKm: number }
  payment: { creditPreferred: boolean; providers: string[] }
  warrantyMinMonths?: number
  openNow: boolean
  deadline?: 'today' | 'tomorrow' | 'this_week'
}
```

Changing any field re-runs search in place. Changing category keeps budget, area, payment and deadline, and clears brand/model/variant. No conversation reset.

### 4.2 Screens

**S1 — خانه / intent composer**
- Brand, one-line promise, link «درباره داده».
- Large input with three real examples, including one phone, one watch, one lighting.
- Category chips, area selector («فردوسی و شیخ هادی»، «نزدیک من»، «روی نقشه»), optional budget, payment toggle.
- Primary CTA «فروشگاه‌ها را پیدا کن»، secondary «با دستیار بگو» opens a chat sheet that writes into the same intent.
- Trust line: «قیمت‌ها ثبت‌شده‌اند؛ موجودی را از فروشگاه می‌پرسیم.»

**S2 — نتایج و مقایسه**
- Sticky intent bar with editable chips.
- Summary sentence: «۳۴ فروشگاه این گوشی را قیمت داده‌اند؛ ۳۲ فروشگاه در محدوده فردوسی و شیخ هادی.»
- Filter chips with counts: «باز الان»، «تأییدشده»، «پرداخت اعتباری»، «گارانتی ۱۸ ماه»، «فردوسی»، «شیخ هادی».
- Product summary card: image, full Persian title, variant, price range.
- Offer cards: shop name, price, price age, warranty, payment badges, distance, hours status, stock status, two "why" reasons, CTA «استعلام موجودی».
- Map/list toggle. Map pins show price; selecting a pin highlights the card.
- Compare action: select up to three shops, open a bottom sheet table (price, warranty, distance, hours, payment, stock status).
- Primary CTA «از ۳ فروشگاه نزدیک بپرس».

**S3 — استعلام و فعالیت دستیار**
- Agent timeline with plain-language steps, not raw logs.
- One thread card per shop: در انتظار پاسخ / تأیید شد / موجود نیست / پاسخ نامشخص.
- Parsed reply chips: موجودی، قیمت، تا ساعت، گارانتی.
- If the reply is ambiguous, the agent sends one targeted follow-up and shows it.
- If unavailable, alternatives appear inline: same product elsewhere, sibling variant, nearby similar product.
- CTA «برنامه سفر را ببین» when at least one shop is confirmed; otherwise «جایگزین‌ها را ببین».

**S4 — برنامه سفر**
- Primary shop with confirmed status, price and «برو قبل از ۲۱:۰۰».
- Route: origin → shop, ordered fallback, walking/driving estimate, Google Maps link.
- Checklist: کارت/پول، گارانتی، IMEI، تست دوربین/باتری، رسید.
- «اگر موجود نبود»: fallback shop with address and one-tap inquiry.
- Share plan as a copyable WhatsApp message.
- Store enrichment (P2, only when `website_url` exists): show the link and a one-line fetched page description; if the fetch fails, say «اطلاعات وب‌سایت در دسترس نیست». No invented claims.
- Transparency block: recorded price age vs owner confirmation time.

**S5 — پنل فروشنده (دمو)**
- `/store`: list of seeded shops with unread count.
- Thread: structured inquiry card (product, variant, question), free-text reply box, quick replies.
- Sending a reply updates the buyer side through the same API the real integration would use.
- Visible label: «پنل نمایشی؛ در نسخه واقعی به واتساپ بیزینس وصل می‌شود.»

**S6 — درباره داده**
- Dataset counts: 6,476 shops, 225,903 products, 331,506 offers.
- 6,364 of 6,476 shop names are synthetic; all phone numbers are synthetic; 112 shops have a website or Instagram.
- Prices are recorded snapshots, not live inventory.
- Shop category is not proof that a product exists; only an offer links a shop to a product.
- Payment options are declared for 266 shops (4.1%); absence means unknown, not "no".
- Hours are declared for 4,473 shops (69%); unsupported/unknown is shown as unknown.
- Where a real website/Instagram exists, show the link; otherwise say «راه ارتباطی قابل انتشار ندارد».

### 4.3 Truthfulness model

Never merge these into one "available" badge:

| Field | Values | UI |
|---|---|---|
| priceStatus | recorded / confirmed / changed | «ثبت‌شده ۷ روز پیش» / «تأیید فروشنده ۱۴:۳۲» / «قیمت عوض شد» |
| stockStatus | unknown / confirmed / unavailable / low | «نامشخص» / «تأیید موجودی» / «تمام شد» |
| hoursStatus | declared / open_now / closed_now / unknown | «اعلام‌شده تا ۲۱:۰۰» / «الان باز است» / «امروز تعطیل» / «نامشخص» |
| paymentStatus | declared / unknown | provider names / «اطلاعی ثبت نشده» |
| source | dataset / owner | small source label on every claim |

Rules:
- A recorded offer is «قیمت‌گذاری‌شده», not «موجود».
- Only an owner reply can set `stockStatus=confirmed`, and it carries a timestamp.
- If the owner changes the price, show both old and new with the change time.
- If hours are `unsupported` or missing, never say «باز است»; say «ساعت کاری نامشخص است».
- Fake phone numbers are never rendered as callable. Contact is replaced by «از فروشگاه بپرس».

### 4.4 Agent behavior

Deterministic orchestration with LLM at the language edges. This is reliable under demo pressure and still genuinely agentic.

```
parse intent
  → search products
  → get offers + shops
  → rank and shortlist 3 (cheapest, closest, payment match)
  → send inquiries in parallel
  → read replies
  → parse reply
      ├─ confirmed → update offer, build visit plan
      ├─ unavailable → find alternatives → ask next shop
      └─ ambiguous → send one targeted follow-up
  → re-rank with confirmations
  → build visit plan (primary + fallback + checklist)
```

Tools:

```ts
parseIntent(text, current): Intent
searchProducts(intent): ProductCandidate[]
getOffers(productId, intent): OfferWithShop[]
rankOffers(offers, intent): RankedOffer[]        // deterministic score + reasons
requestConfirmation(shopIds, productId, message): Thread[]
readReplies(threadIds): Message[]
parseOwnerReply(text, context): OwnerReply      // LLM + regex fallback
sendFollowUp(threadId, missingField): Message
findAlternatives(intent, failedOffer): Alternative[]
buildVisitPlan(selected, fallbacks, intent): VisitPlan
```

Guardrails:
- Max 8 agent steps per run; max 3 shops per inquiry round; 8s LLM timeout; one retry.
- Every step is written to `agent_events` and rendered in the timeline.
- If the LLM is unavailable, the regex parser still handles «موجود»، «تمام»، «تومان»، «تا ۹ شب»، Persian digits.
- The user can stop the agent or edit the intent mid-run; the run is cancelled and re-planned.

### 4.5 Ranking and explanations

Score (0–1):
- 0.30 relevance to the exact variant
- 0.20 owner-confirmed stock
- 0.15 price relative to the best confirmed price
- 0.10 distance from the selected area
- 0.10 open now / open before the deadline
- 0.08 payment match
- 0.07 warranty match

Every card shows at most two reasons, in plain Persian:
- «ارزان‌ترین فروشگاه محدوده»
- «موجودی را ۲ دقیقه پیش تأیید کرد»
- «تا ۲۱:۰۰ باز است»
- «پرداخت اعتباری دارد»
- «گارانتی ۱۸ ماه شرکتی»

No reason is generated if the underlying field is missing.

## 5. Data

### 5.1 Source and preprocessing

Source: `torob-dataset/` (`shops.csv`, `products.csv`, `offers.csv`), UTF-8, JSON-in-CSV fields, literal `null`.

Build script: `scripts/build_db.py` (Python stdlib + sqlite3 + FTS5). Output: `data/torob.db`.

Tables:
- `shops` — all columns, JSON fields parsed into columns or JSON text.
- `products` — all columns, `image_urls` and `specs` as JSON text.
- `offers` — all columns, `price_toman` nullable integer, `last_price_changed_at` ISO timestamp.
- `products_fts` — normalized Persian title + brand + category + model, `unicode61` tokenizer.
- `confirmations` — product/shop/thread, status, confirmed price, confirmed hours, timestamps.
- `messages` — thread, role (`buyer`/`owner`/`agent`), text, parsed JSON, created_at.
- `agent_events` — run_id, step, tool, input/output JSON, created_at.

Normalization:
- Arabic `ي`/`ك` → Persian `ی`/`ک`.
- Remove ZWNJ for the search index; keep it for display.
- Persian digits → Latin for query parsing; display back in Persian.
- Collapse spaces, lowercase English model names.
- Map granular dataset categories to six UI groups; keep the original category on the product card.

Indexes:
- `offers(product_id)`, `offers(shop_id)`, `products_fts`, `shops(location_label)`.
- `VACUUM` after build.

### 5.2 Demo seed

Hero product: `product_6c62d575e3d247f6f29e051a` — «گوشی سامسونگ (ویتنام) S25 FE 5G | حافظه ۲۵۶ رم ۸ گیگابایت», 34 offers.

Seeded shops:

| Shop | Shop ID | Price | Demo role | Owner reply |
|---|---|---:|---|---|
| نویار آذروش | `shop_20d56d048f03a19fec6bf58c` | 184,000,000 | cheapest, will be out of stock | «این مدل ۲۵۶ تموم شده.» |
| نی‌آرا آروان | `shop_1ffc7576fed58fa57cd99a21` | 184,200,000 | cheapest open, will be out of stock | «این مدل ۲۵۶ تموم شده.» |
| رووان مهرآرا | `shop_ec32a89464e8016804212b92` | 184,600,000 | primary confirmation | «هست ۱۸۴٬۶۰۰٬۰۰۰ تومان؛ تا ۹ شب؛ گارانتی ۱۸ ماه.» |
| آذرنوش رویس | `shop_a89f7ff44bb5801bc1f42da4` | 192,000,000 | nearest, asked but not primary | «هست ۱۹۲ میلیون؛ تا ۹ شب.» |
| رویار نیک‌نوش | `shop_f3804c06a114592c95710713` | 184,899,999 | asked after the rejection | «هست ۱۸۴٬۹۰۰٬۰۰۰؛ تا ۹ شب.» |
| مانان مانینا | `shop_581df06e4845192eafcbcf47` | 186,000,000 | fallback with earlier closing | «هست ۱۸۶ میلیون؛ تا ۹ شب.» |
| آروان دیسین | `shop_0201f9487d68b9ba04ec2e1d` | 197,898,000 | payment filter example | «هست ۱۹۷٬۸۹۸٬۰۰۰؛ با تارا و ازکی‌وام.» |

Alternative when the cheapest is out of stock: the real India-variant product `product_f07ef205504b7ab37b60b509` — «گوشی سامسونگ (هند) S25 FE 5G | حافظه ۲۵۶ رم ۸ گیگابایت» at 188,800,000 from نیینا نیان (`shop_d31ef83bf64457123dccc6f2`), پاساژ چارسو، طبقه اول، واحد C30؛ ۳۵.۶۹۴۷۰۷، ۵۱.۴۱۲۲۴۴.

Exact facts from the dataset for the demo:
- نی‌آرا: پاساژ بزرگمهر، طبقه همکف، پلاک ۱۸؛ ۳۵.۶۹۴۹۷۸، ۵۱.۴۱۱۳۳۸؛ چهارشنبه ۱۰:۳۰–۲۱:۰۰؛ گارانتی ۱۸ ماه؛ ارسال فوری.
- رویار: پاساژ چارسو، طبقه منفی ۱، پلاک ۴۶؛ ۳۵.۶۹۴۸۵۹، ۵۱.۴۱۲۲۹۲؛ چهارشنبه ۱۰:۳۰–۲۱:۰۰.
- نویار: بازار موبایل ایران، طبقه دوم، پلاک ۴۰۷؛ ۳۵.۶۹۰۷۷۲، ۵۱.۴۱۰۹۹۹؛ چهارشنبه ۱۱:۰۰–۲۰:۰۰؛ ارسال فوری.
- آروان دیسین: مجتمع تجارت جهانی فردوسی، طبقه ششم، واحد ۲۵؛ ۳۵.۷۰۰۹۱۸، ۵۱.۴۱۹۳۱۹؛ ساعت کاری ثبت نشده؛ پرداخت تارا/ازکی‌وام.

Second category seed: a watch product with 7 offers from the dataset; exact product chosen at build time by a query. No owner confirmation in the second act; it only proves category switching.

### 5.3 Data honesty

- Every price card shows `last_price_changed_at` as relative time.
- The data sheet explains synthetic names/phones and the 10% geographic sample.
- Shop category is never used as evidence of product availability.
- Missing payment data is «نامشخص», not «ندارد».
- The owner inbox is labeled as a demo integration; the buyer side receives real arbitrary replies.
- No real personal data is stored; owner replies are ephemeral demo messages.

## 6. Architecture

**Stack:**
- Next.js 15 App Router + TypeScript
- Tailwind CSS v4 + `ux/tokens.css` from fordi
- Vazirmatn (self-hosted in `public/fonts` for Iran access)
- Lucide icons
- SQLite via `better-sqlite3`
- Leaflet + OpenStreetMap tiles (no API key)
- LLM via an OpenAI-compatible endpoint (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`)
- Zod for API validation
- No ORM; typed SQL helpers keep the build fast.

**Repo layout:**

```
app/
  page.tsx                 S1
  results/page.tsx         S2
  ask/[runId]/page.tsx     S3
  plan/[runId]/page.tsx    S4
  store/page.tsx           S5
  store/[shopId]/page.tsx  S5 thread
  api/intent/route.ts
  api/search/route.ts
  api/confirmations/route.ts
  api/confirmations/[threadId]/route.ts
  api/owner/reply/route.ts
  api/visit-plan/route.ts
  api/health/route.ts
components/
  IntentBar.tsx
  OfferCard.tsx
  CompareSheet.tsx
  MapPanel.tsx
  AgentTimeline.tsx
  StatusChip.tsx
  Price.tsx
  DataSheet.tsx
lib/
  db.ts
  search.ts
  rank.ts
  agent.ts
  llm.ts
  owner-parse.ts
  hours.ts
  format.ts
  types.ts
scripts/
  build_db.py
  seed_demo.py
  smoke.mjs
data/
  torob.db
ux/                        fordi artifacts
plan.md
Dockerfile
.env.example
```

**API contracts:**

```ts
POST /api/intent/parse
  { text: string, current?: Intent } → { intent: Intent, missing: string[] }

POST /api/search
  { intent: Intent } → {
    product: ProductSummary,
    offers: OfferWithShop[],
    facets: { paymentCount: number, openNowCount: number, confirmedCount: number },
    area: { label: string, center: [number, number] }
  }

POST /api/confirmations
  { productId: string, shopIds: string[], question: string } → { runId: string, threads: Thread[] }

GET /api/confirmations?runId=...
  → { threads: ThreadWithMessages[], status: 'waiting'|'partial'|'done' }

POST /api/owner/reply
  { threadId: string, text: string } → { message: Message, parsed: OwnerReply, needsFollowUp: boolean }

POST /api/visit-plan
  { runId: string } → { plan: VisitPlan }

GET /api/health
  → { ok: true, shops: number, products: number, offers: number, llm: boolean }
```

**Owner inbox update path:** owner reply → server stores message → parses with LLM/regex → updates confirmation → buyer page polls every 1.5s and sees the new status. No WebSocket needed for a 5-minute demo.

**Demo reset:** `POST /api/demo/reset` clears `messages`, `confirmations`, `agent_events` for the seeded run and restores the initial offer statuses. Button in the owner panel and a hidden keyboard shortcut in the buyer app.

**Map:** plain Leaflet in a client component, dynamically imported with `ssr: false`; OSM tiles; custom price markers; no API key.

**Fonts and numbers:** `Intl.NumberFormat('fa-IR')` for prices; `Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran' })` for dates; relative time helper; no `tabular-nums`.

## 7. Persian, RTL and the fordi pipeline

`fordi-skill/` is a required part of the build, not decoration.

**Pipeline:**

```bash
node fordi-skill/scripts/fordi.mjs status
node fordi-skill/scripts/fordi.mjs scaffold idea
# fill ux/idea.md in Persian
node fordi-skill/scripts/fordi.mjs check idea

node fordi-skill/scripts/fordi.mjs scaffold direction
node fordi-skill/scripts/fordi.mjs roll
# build ux/direction.html with the dealt cards + canon
# user picks; fill ux/direction.md and ux/tokens.css
node fordi-skill/scripts/fordi.mjs check direction

node fordi-skill/scripts/fordi.mjs scaffold flows
# write flows for S1–S6, with every required state
node fordi-skill/scripts/fordi.mjs check flows
node fordi-skill/scripts/fordi.mjs flowmap

node fordi-skill/scripts/fordi.mjs scaffold refs
# every screen answered with a real reference or «رد شد»
node fordi-skill/scripts/fordi.mjs check refs
```

The fordi prototype is a design artifact, not a second product. In this timebox, stop after `refs` and build the real UI in Next.js from `flows.md` and `tokens.css`. If there is spare time, run the full prototype for all six screens and use it as a visual reference; do not run `check prototype` on a partial build, and do not build the same UI twice.

**Hard rules carried into the app:**
- 375px first; no horizontal overflow; nothing under the keyboard.
- Persian digits, proportional (never `tabular-nums`).
- Toman everywhere, thousands separators.
- Solar Hijri dates.
- Persian `ی`/`ک`, correct ZWNJ.
- Mixed-direction brand names and URLs isolated with `dir="ltr"` spans.
- Logical Tailwind utilities only: `ms- me- ps- pe- start- end- text-start text-end border-s rounded-s`.
- Rows of controls stay on one line and share height; buttons `whitespace-nowrap`, `min-h-11`.
- One icon library (Lucide), one stroke weight.
- Motion only for state feedback; honor `prefers-reduced-motion`.
- No gradients as text, no glass decoration, no emoji icons, no nested cards.

**Design direction candidate (fordi will roll the final set):** the visual world of a Tehran passage: unit-number signs, price labels stuck on boxes, shop stamps, receipt paper, fluorescent light. Warm paper surface, ink text, one saturated "confirmed" accent. Avoid the default purple AI gradient and the cream/serif/terracotta template.

## 8. Build schedule (few hours, agent-executed)

Total: ~4h30 with a 30-minute buffer. Two humans direct and approve; agents own files. Checkpoints are hard stops.

| Time | Phase | Work | Checkpoint |
|---|---|---|---|
| 0:00–0:20 | Freeze | Approve plan; create repo; `.env`; install deps; copy fordi; start `build_db.py` in background | Scope frozen |
| 0:20–0:45 | Data | Finish DB build; verify counts; seed demo; query S25 FE; health endpoint | `/api/health` reports 6,476 / 225,903 / 331,506 |
| 0:45–1:20 | Design | fordi `idea` + `direction`; user picks direction; `tokens.css`; `flows` for S1–S6; `refs`; checks pass | User approves visual direction |
| 1:20–2:30 | Core app | S1 + S2 + search + cards + map + compare + S4 shell; S5 owner inbox; API contracts | Search for the demo query returns 34 offers |
| 2:30–3:20 | Agent loop | Intent parser, shortlist, inquiries, owner reply parser, follow-up, alternatives, visit plan, timeline | Owner reply updates buyer card live |
| 3:20–3:50 | Polish | Empty/loading/error states, 375px, RTL checks, demo reset, copy, health, smoke script | fordi idea/direction/flows/refs checks pass; manual 375px pass |
| 3:50–4:15 | Deploy | Docker build, deploy, smoke test live URL, seed reset | Live URL works from a phone |
| 4:15–4:45 | Demo | Rehearse twice, record 5 minutes, export | Video file ready |

**Parallel work ownership (avoid merge conflicts):**

- **Agent A — data/search:** `scripts/build_db.py`, `lib/db.ts`, `lib/search.ts`, `lib/hours.ts`, `api/search`.
- **Agent B — buyer UI:** `app/page.tsx`, `app/results`, `components/IntentBar`, `OfferCard`, `CompareSheet`, `MapPanel`, `StatusChip`, `Price`.
- **Agent C — owner + messages:** `app/store`, `lib/messages.ts`, `api/confirmations`, `api/owner/reply`.
- **Agent D — agent/LLM:** `lib/agent.ts`, `lib/llm.ts`, `lib/owner-parse.ts`, `api/intent`, `api/visit-plan`.
- **Lead:** `lib/types.ts`, `lib/format.ts`, `app/layout.tsx`, design tokens, integration, deploy, demo.
- Freeze `lib/types.ts` before parallel work. No agent edits another agent's files without asking.

**Cut order if behind:**
1. Compare sheet.
2. Map (keep a static locator link).
3. Second category act.
4. Auto-follow-up animation (keep the logic, show a simpler status).
5. Never cut: owner confirmation, visit plan, RTL polish, deploy, video.

## 9. Deployment

Primary: **Liara Docker** (Iran-accessible, persistent disk). Fallback: any Docker host (Render/Railway/Fly) or a VPS. Vercel is not primary because SQLite writes and a ~250 MB DB do not fit serverless well.

- Multi-stage Dockerfile: build DB in a Python builder stage, copy `data/torob.db` into the Node runtime.
- `PORT=3000`, `NODE_ENV=production`; mount `/app/data` if the host supports volumes.
- Env: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `OWNER_DEMO_KEY` (optional).
- Health: `/api/health` returns row counts and `llm: true/false`; no secrets.
- Smoke: `node scripts/smoke.mjs https://<host>` checks health, search, inquiry, owner reply, visit plan.
- Deploy at T+3:50, not at the end. Record the demo from the live URL.
- If deploy fails: run the same Docker image locally and use a tunnel; keep the live URL attempt in the video only if it works.

## 10. Demo video script

5 minutes, Persian voiceover. If voice is not possible, burn in Persian captions; silent is worse but acceptable.

| Time | Visual | Narration |
|---|---|---|
| 0:00 | Split: a passage corridor, three closed shutters | «سه پاساژ، سه بار "نداریم". مشکل جست‌وجو نیست؛ مشکل رفتن است.» |
| 0:15 | Home, typing the sentence | «هم‌قدم اول می‌فهمد دقیقاً چه می‌خواهی.» |
| 0:35 | Intent bar; switch category to watch and back | «هر بخش را می‌شود عوض کرد؛ بدون شروع دوباره.» |
| 1:00 | Results, scroll cards, map | «۳۴ فروشگاه قیمت داده‌اند. اما قیمت با موجودی یکی نیست.» |
| 1:25 | Price age + status chips | «این قیمت هفت روز پیش ثبت شده؛ موجودی هنوز تأیید نشده.» |
| 1:40 | Tap ask, timeline | «دستیار از سه فروشگاه نزدیک می‌پرسد.» |
| 2:00 | Owner tab, type arbitrary reply | «فروشنده با متن آزاد جواب می‌دهد.» |
| 2:20 | Buyer tab updates, card flips | «دستیار جواب را می‌خواند، قیمت و ساعت را درمی‌آورد، و وضعیت را عوض می‌کند.» |
| 2:35 | Out of stock, alternative | «اگر تمام شده باشد، جایگزین پیشنهاد می‌دهد و فروشگاه بعدی را می‌پرسد.» |
| 3:00 | Visit plan | «برنامه سفر: کجا، تا کی، اگر نبود کجا.» |
| 3:25 | Payment filter | «فقط دو فروشگاه پرداخت اعتباری دارند؛ هر دو گران‌ترند. دستیار این را پنهان نمی‌کند.» |
| 3:50 | Switch to watch | «همین مسیر برای ساعت هم کار می‌کند.» |
| 4:05 | Data sheet | «داده‌ها صادقانه برچسب خورده‌اند: نام و شماره نمایشی، قیمت ثبت‌شده، موجودی تأییدشده.» |
| 4:25 | Live URL + agent trace | «هم‌قدم: قبل از رفتن، مطمئن شو.» |

Rehearse once with a reset, once with an unscripted owner reply. Record the second take. Show the live URL in the browser bar.

## 11. Scoring map

| Criterion | Points | How this plan earns them |
|---|---:|---|
| Product | 75 | One complete in-person purchase: search, compare, locate, ask, confirm, fallback, visit plan. |
| UX | 75 | Persian RTL mobile-first, editable intent, cards/filters, no chat-only, every state, fordi checks. |
| Intelligence | 50 | Owner inquiries, free-text parsing, follow-up, out-of-stock alternative, hours/payment/route reasoning. |
| Deploy | 40 | Docker, live URL, health, smoke test, seeded reset, early deploy. |
| Technical | 40 | Deterministic agent loop + tools, typed contracts, SQLite/FTS5, normalization, tests, observability. |
| Dataset | 20 | Correct joins, price age, stock vs price, shop vs product, payment/hours coverage, data sheet. |

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| LLM key missing or slow | Deterministic parser fallback; 8s timeout; pre-warm; demo path does not depend on LLM for search. |
| Owner inbox looks fake | Arbitrary free-text replies; no canned buttons required; show parsed result; label the integration honestly. |
| Fake shop names/phones | Never show fake phones; data sheet explains synthetic names; use real website/Instagram links where present. |
| Price null or stale | Null-safe queries; show «قیمت نامشخص»; never rank null as zero. |
| FTS misses Persian variants | Normalization + LIKE fallback + curated demo query. |
| RTL layout breaks at 375px | fordi prototype + `window.fordiCheck()` + manual iPhone-width pass. |
| Deploy fails late | Deploy at T+3:50; local Docker fallback; smoke script. |
| Scope creep | Cut order fixed; one hero category, one proof category. |
| Message state lost on restart | Demo reset endpoint; optional volume; seed script. |
| Judges cannot access foreign host | Liara primary; local fallback video. |

## 13. Decisions I made for you (override any)

- Working name **هم‌قدم**; rename is a one-line change.
- Hero product is **Samsung S25 FE 256/8** because it has 34 offers and a real Ferdowsi/Sheikh Hadi cluster.
- The owner inbox is a **demo panel**, not a real WhatsApp integration; the message API is shaped so WhatsApp Business can replace it.
- Payment filter is **off by default** because only 266 shops declare payment options; when on, it shows the count and the tradeoff.
- No login, no checkout, no delivery; the product ends at a confident visit plan.
- SQLite on a Docker host, not Vercel, because the dataset and message writes need a real disk.

## 14. What I need from you before build

1. **LLM access:** an API key and provider (OpenAI-compatible, Gemini, OpenRouter, or a local endpoint). If none, we ship the regex fallback and lose some intelligence points.
2. **Deploy target:** Liara account, another Docker host, or a VPS. If none, we deploy locally and tunnel for the demo.
3. **Name:** keep هم‌قدم or change it.
4. **Voiceover:** Persian voice or silent captioned video.
5. **Visual direction:** you will pick from the fordi roll; I will not decide it for you.

## 15. Definition of done

- [ ] `fordi check idea`, `direction`, `flows`, `refs` pass; `tokens.css` is used by the app.
- [ ] Search for the demo sentence returns the S25 FE and at least 20 offers.
- [ ] Category switch keeps budget/area/payment and updates results in place.
- [ ] Price age, stock status and hours status are visually separate.
- [ ] Owner reply in free Persian text updates the buyer card within 2 seconds.
- [ ] Out-of-stock reply produces an alternative and a next-shop inquiry.
- [ ] Visit plan has primary shop, fallback, route link, timing and checklist.
- [ ] Payment filter shows a count and an honest tradeoff.
- [ ] 375px pass: no overflow, no clipped/wrapped buttons, 44px targets, logical utilities only.
- [ ] `/api/health` reports the dataset counts; smoke script passes against the live URL.
- [ ] Demo reset works; 5-minute video recorded from the live URL.
- [ ] Data sheet states synthetic names/phones, price age, shop-vs-product distinction, payment/hours coverage.
