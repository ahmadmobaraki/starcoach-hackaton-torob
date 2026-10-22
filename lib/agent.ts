import { getDb, newRunId, nowIso } from "./db";
import { CHECKLIST, DEMO_PRODUCT_ID, DEMO_SHOP_IDS } from "./demo";
import { formatToman, formatTimeFa, toFaDigits } from "./format";
import { parseOwnerReply } from "./owner-parse";
import { getOffers, getProductSummary, searchAlternatives } from "./search";
import type {
  AgentEvent,
  Intent,
  Message,
  OfferWithShop,
  OwnerReply,
  RunState,
  Thread,
  VisitPlan,
} from "./types";

type RunRow = {
  run_id: string;
  product_id: string;
  intent_json: string;
  created_at: string;
};

type ConfirmationRow = {
  id: number;
  run_id: string;
  product_id: string;
  shop_id: string;
  status: string;
  requested_at: string | null;
  confirmed_at: string | null;
  confirmed_price: number | null;
  confirmed_hours: string | null;
  note: string | null;
  thread_id: string;
};

type MessageRow = {
  id: number;
  thread_id: string;
  run_id: string;
  shop_id: string;
  role: string;
  text: string;
  parsed: string | null;
  created_at: string;
};

function addEvent(runId: string, kind: string, title: string, detail?: string | null) {
  const db = getDb();
  const next = db
    .prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM agent_events WHERE run_id = ?")
    .get(runId) as { n: number };
  db.prepare(
    `INSERT INTO agent_events (run_id, seq, kind, title, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(runId, next.n, kind, title, detail ?? null, nowIso());
}

function addMessage(
  threadId: string,
  runId: string,
  shopId: string,
  role: string,
  text: string,
  parsed?: OwnerReply | null,
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO messages (thread_id, run_id, shop_id, role, text, parsed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(threadId, runId, shopId, role, text, parsed ? JSON.stringify(parsed) : null, nowIso());
}

function inquiryText(productTitle: string, intent: Intent): string {
  const storage = intent.variant?.storageGb ? ` حافظه ${toFaDigits(intent.variant.storageGb)}` : "";
  return `سلام، ${productTitle}${storage} موجوده؟ قیمت روز، ساعت کاری امروز و گارانتی رو هم می‌فرمایید؟`;
}

function threadIdFor(runId: string, shopId: string): string {
  return `thr_${runId.replace(/^run_/, "")}_${shopId.slice(-8)}`;
}

function shortlist(offers: OfferWithShop[], intent: Intent): OfferWithShop[] {
  const openFirst = offers.filter((o) => o.hours.state === "open");
  const pool = intent.deadline === "today" && openFirst.length > 0 ? openFirst : offers;
  const withPrice = pool.filter((o) => o.price != null);
  const cheapest = [...withPrice].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
  const nearest = [...pool]
    .filter((o) => o.distanceKm != null)
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))[0];
  const credit = pool.find((o) => o.hasCredit);
  const picks: OfferWithShop[] = [];
  for (const candidate of [cheapest, nearest, credit, ...pool]) {
    if (!candidate) continue;
    if (picks.some((p) => p.shop.shopId === candidate.shop.shopId)) continue;
    picks.push(candidate);
    if (picks.length >= 3) break;
  }
  return picks;
}

export function startRun(intent: Intent, productId = DEMO_PRODUCT_ID): RunState | null {
  const product = getProductSummary(productId);
  if (!product) return null;
  const { offers } = getOffers(productId, intent);
  if (offers.length === 0) return null;

  const runId = newRunId();
  const db = getDb();
  db.prepare("INSERT INTO runs (run_id, product_id, intent_json, created_at) VALUES (?, ?, ?, ?)").run(
    runId,
    productId,
    JSON.stringify(intent),
    nowIso(),
  );

  const picks = shortlist(offers, intent);
  for (const offer of picks) {
    const threadId = threadIdFor(runId, offer.shop.shopId);
    db.prepare(
      `INSERT INTO confirmations
       (run_id, product_id, shop_id, status, requested_at, thread_id)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
    ).run(runId, productId, offer.shop.shopId, nowIso(), threadId);
    addMessage(threadId, runId, offer.shop.shopId, "buyer", inquiryText(product.title, intent));
  }

  addEvent(
    runId,
    "shortlist",
    `${toFaDigits(picks.length)} فروشگاه نزدیک را انتخاب کردم`,
    picks.map((p) => `${p.shop.name} — ${formatToman(p.price)}`).join(" · "),
  );
  addEvent(
    runId,
    "inquiry",
    "به فروشگاه‌ها پیام دادم",
    picks.map((p) => p.shop.name).join("، "),
  );

  return getRun(runId);
}

function messagesFor(threadId: string): Message[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY id ASC")
    .all(threadId) as MessageRow[];
  return rows.map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    runId: row.run_id,
    shopId: row.shop_id,
    role: row.role as Message["role"],
    text: row.text,
    parsed: row.parsed ? (JSON.parse(row.parsed) as OwnerReply) : null,
    createdAt: row.created_at,
  }));
}

function eventsFor(runId: string): AgentEvent[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM agent_events WHERE run_id = ? ORDER BY seq ASC")
    .all(runId) as {
    id: number;
    run_id: string;
    seq: number;
    kind: string;
    title: string;
    detail: string | null;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    seq: row.seq,
    kind: row.kind,
    title: row.title,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}

export function getRun(runId: string): RunState | null {
  const db = getDb();
  const run = db.prepare("SELECT * FROM runs WHERE run_id = ?").get(runId) as RunRow | undefined;
  if (!run) return null;
  const intent = JSON.parse(run.intent_json) as Intent;
  const product = getProductSummary(run.product_id);
  if (!product) return null;

  const confirmations = db
    .prepare("SELECT * FROM confirmations WHERE run_id = ? ORDER BY id ASC")
    .all(runId) as ConfirmationRow[];

  const threads: Thread[] = [];
  for (const c of confirmations) {
    const { offers } = getOffers(c.product_id, intent);
    const offer = offers.find((o) => o.shop.shopId === c.shop_id);
    if (!offer) continue;
    threads.push({
      threadId: c.thread_id,
      shop: offer.shop,
      offer: {
        ...offer,
        confirmation: {
          threadId: c.thread_id,
          status: c.status as Thread["confirmation"]["status"],
          requestedAt: c.requested_at,
          confirmedAt: c.confirmed_at,
          confirmedPrice: c.confirmed_price,
          confirmedHours: c.confirmed_hours,
          note: c.note,
        },
      },
      confirmation: {
        threadId: c.thread_id,
        status: c.status as Thread["confirmation"]["status"],
        requestedAt: c.requested_at,
        confirmedAt: c.confirmed_at,
        confirmedPrice: c.confirmed_price,
        confirmedHours: c.confirmed_hours,
        note: c.note,
      },
      messages: messagesFor(c.thread_id),
    });
  }

  const status: RunState["status"] = threads.some((t) => t.confirmation.status === "confirmed")
    ? "confirmed"
    : threads.length > 0 && threads.every((t) => t.confirmation.status === "unavailable")
      ? "unavailable"
      : threads.some((t) => t.messages.some((m) => m.role === "owner"))
        ? "partial"
        : "waiting";

  const alternatives =
    status === "unavailable" || threads.some((t) => t.confirmation.status === "unavailable")
      ? searchAlternatives(
          product,
          intent,
          threads.map((t) => t.shop.shopId),
        )
      : [];

  return {
    runId,
    product,
    intent,
    threads,
    events: eventsFor(runId),
    status,
    alternatives,
  };
}

function nextInquiry(runId: string, intent: Intent, productTitle: string, productId: string) {
  const db = getDb();
  const existing = db
    .prepare("SELECT shop_id FROM confirmations WHERE run_id = ?")
    .all(runId) as { shop_id: string }[];
  const existingIds = existing.map((x) => x.shop_id);
  if (existingIds.length >= 6) return;

  const { offers } = getOffers(productId, intent);
  const next = offers.find((o) => !existingIds.includes(o.shop.shopId) && o.price != null);
  if (!next) return;

  const threadId = threadIdFor(runId, next.shop.shopId);
  db.prepare(
    `INSERT INTO confirmations
     (run_id, product_id, shop_id, status, requested_at, thread_id)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
  ).run(runId, productId, next.shop.shopId, nowIso(), threadId);
  addMessage(threadId, runId, next.shop.shopId, "buyer", inquiryText(productTitle, intent));
  addEvent(
    runId,
    "replan",
    `فروشگاه بعدی را پرسیدم: ${next.shop.name}`,
    "چون فروشگاه قبلی موجودی را رد کرد.",
  );
}

export async function ownerReply(
  threadId: string,
  text: string,
): Promise<{ parsed: OwnerReply; run: RunState | null } | null> {
  const db = getDb();
  const confirmation = db
    .prepare("SELECT * FROM confirmations WHERE thread_id = ?")
    .get(threadId) as ConfirmationRow | undefined;
  if (!confirmation) return null;
  const run = db
    .prepare("SELECT * FROM runs WHERE run_id = ?")
    .get(confirmation.run_id) as RunRow | undefined;
  if (!run) return null;
  const intent = JSON.parse(run.intent_json) as Intent;
  const product = getProductSummary(confirmation.product_id);
  if (!product) return null;
  const offer = getOffers(confirmation.product_id, intent).offers.find(
    (o) => o.shop.shopId === confirmation.shop_id,
  );

  const parsed = await parseOwnerReply(text, {
    productTitle: product.title,
    storageGb: intent.variant?.storageGb,
    shopName: offer?.shop.name ?? "فروشگاه",
  });

  const requestedStorage = intent.variant?.storageGb;
  const onlyAlternative =
    parsed.available === true &&
    parsed.alternativeStorageGb != null &&
    requestedStorage != null &&
    parsed.alternativeStorageGb !== requestedStorage;
  const status = onlyAlternative
    ? "unavailable"
    : parsed.available === true
      ? "confirmed"
      : parsed.available === false
        ? "unavailable"
        : "ambiguous";
  const confirmedPrice =
    parsed.available === true && !onlyAlternative ? parsed.priceToman ?? offer?.price ?? null : null;
  db.prepare(
    `UPDATE confirmations
     SET status = ?, confirmed_at = ?, confirmed_price = ?, confirmed_hours = ?, note = ?
     WHERE thread_id = ?`,
  ).run(
    status,
    status === "confirmed" ? nowIso() : null,
    confirmedPrice,
    parsed.closesAt,
    parsed.note,
    threadId,
  );
  addMessage(threadId, confirmation.run_id, confirmation.shop_id, "owner", text, parsed);

  const shopName = offer?.shop.name ?? "فروشگاه";
  if (status === "confirmed") {
    addEvent(
      confirmation.run_id,
      "confirmed",
      `${shopName} موجودی را تأیید کرد`,
      `${formatToman(confirmedPrice)}${parsed.closesAt ? ` · تا ${toFaDigits(parsed.closesAt)}` : ""}`,
    );
    if (parsed.priceToman == null || parsed.closesAt == null) {
      const question =
        parsed.priceToman == null
          ? "قیمت روز و ساعت کاری امروز را هم می‌فرمایید؟"
          : "تا چه ساعتی باز هستید؟";
      addMessage(threadId, confirmation.run_id, confirmation.shop_id, "agent", question);
      addEvent(confirmation.run_id, "followup", "یک سؤال دقیق‌تر پرسیدم", question);
    }
  } else if (status === "unavailable") {
    addEvent(
      confirmation.run_id,
      "unavailable",
      onlyAlternative
        ? `${shopName} فقط ${toFaDigits(parsed.alternativeStorageGb!)} گیگ دارد`
        : `${shopName} گفت موجود نیست`,
      parsed.note,
    );
    nextInquiry(confirmation.run_id, intent, product.title, confirmation.product_id);
  } else {
    addEvent(confirmation.run_id, "ambiguous", `پاسخ ${shopName} کامل نبود`, parsed.note);
    const question =
      parsed.available == null
        ? "فقط تأیید می‌کنید موجود است یا نه؟"
        : "قیمت روز را هم می‌فرمایید؟";
    addMessage(threadId, confirmation.run_id, confirmation.shop_id, "agent", question);
    addEvent(confirmation.run_id, "followup", "یک سؤال دقیق‌تر پرسیدم", question);
  }

  return { parsed, run: getRun(confirmation.run_id) };
}

export function buildVisitPlan(runId: string): VisitPlan | null {
  const run = getRun(runId);
  if (!run) return null;
  const confirmed = run.threads
    .filter((t) => t.confirmation.status === "confirmed")
    .sort((a, b) => b.offer.score - a.offer.score);
  const pending = run.threads
    .filter((t) => t.confirmation.status === "pending" || t.confirmation.status === "ambiguous")
    .sort((a, b) => {
      const openA = a.offer.hours.state === "open" ? 0 : 1;
      const openB = b.offer.hours.state === "open" ? 0 : 1;
      if (openA !== openB) return openA - openB;
      return b.offer.score - a.offer.score;
    });
  const primary = confirmed[0]?.offer ?? pending[0]?.offer ?? null;
  const fallbackCandidates = [
    ...confirmed.slice(1).map((t) => t.offer),
    ...pending.map((t) => t.offer),
    ...run.alternatives,
  ].filter((o) => o.shop.shopId !== primary?.shop.shopId);
  const openFallbacks = fallbackCandidates.filter((o) => o.hours.state === "open");
  const fallbackPool = openFallbacks.length > 0 ? openFallbacks : fallbackCandidates;
  fallbackPool.sort((a, b) => {
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return a.price - b.price;
  });
  const fallback = fallbackPool[0] ?? null;
  const alternatives = run.alternatives.filter(
    (alt) => alt.shop.shopId !== primary?.shop.shopId && alt.shop.shopId !== fallback?.shop.shopId,
  );

  const close = primary?.hours.today?.close ?? null;
  const message = primary
    ? `هم‌قدم: برای ${run.product.title} برو ${primary.shop.name}، ${primary.shop.address}.${
        close ? ` تا ${close} باز است.` : ""
      }${fallback ? ` اگر موجود نبود: ${fallback.shop.name}.` : ""}`
    : "هنوز فروشگاهی موجودی را تأیید نکرده است. جایگزین‌ها را ببین.";

  return {
    runId,
    product: run.product,
    intent: run.intent,
    primary,
    fallback,
    alternatives,
    checklist: CHECKLIST,
    message,
    mustLeaveBy: close,
  };
}

export function resetDemo() {
  const db = getDb();
  db.prepare("DELETE FROM messages").run();
  db.prepare("DELETE FROM confirmations").run();
  db.prepare("DELETE FROM agent_events").run();
  db.prepare("DELETE FROM runs").run();
}

export function getStoreList() {
  const db = getDb();
  const placeholders = DEMO_SHOP_IDS.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT shop_id, name, address, location_label, weekly_hours
       FROM shops WHERE shop_id IN (${placeholders})`,
    )
    .all(...DEMO_SHOP_IDS) as {
    shop_id: string;
    name: string;
    address: string | null;
    location_label: string | null;
    weekly_hours: string | null;
  }[];
  const order = new Map(DEMO_SHOP_IDS.map((id, index) => [id, index]));
  return rows.sort((a, b) => (order.get(a.shop_id) ?? 99) - (order.get(b.shop_id) ?? 99));
}

export function getStoreThreads(shopId: string): Thread[] {
  const db = getDb();
  const confirmations = db
    .prepare(
      `SELECT * FROM confirmations WHERE shop_id = ? ORDER BY id DESC LIMIT 12`,
    )
    .all(shopId) as ConfirmationRow[];
  const threads: Thread[] = [];
  for (const c of confirmations) {
    const run = db.prepare("SELECT * FROM runs WHERE run_id = ?").get(c.run_id) as RunRow | undefined;
    if (!run) continue;
    const intent = JSON.parse(run.intent_json) as Intent;
    const { offers } = getOffers(c.product_id, intent);
    const offer = offers.find((o) => o.shop.shopId === c.shop_id);
    if (!offer) continue;
    threads.push({
      threadId: c.thread_id,
      shop: offer.shop,
      offer,
      confirmation: {
        threadId: c.thread_id,
        status: c.status as Thread["confirmation"]["status"],
        requestedAt: c.requested_at,
        confirmedAt: c.confirmed_at,
        confirmedPrice: c.confirmed_price,
        confirmedHours: c.confirmed_hours,
        note: c.note,
      },
      messages: messagesFor(c.thread_id),
    });
  }
  return threads;
}

export function formatThreadTime(iso: string): string {
  return formatTimeFa(iso);
}
