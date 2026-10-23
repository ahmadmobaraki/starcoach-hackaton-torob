import { getDb } from "./db";
import { normalizeText, shortAddress, toFaDigits } from "./format";
import { getHoursStatus } from "./hours";
import { rankOffers } from "./rank";
import type {
  CategoryGroup,
  Confirmation,
  Facets,
  Intent,
  OfferWithShop,
  PaymentProvider,
  ProductSummary,
  SearchResult,
  Shop,
} from "./types";

type ProductRow = {
  product_id: string;
  persian_title: string | null;
  brand_name: string | null;
  category_name: string | null;
  category_group: CategoryGroup;
  model: string | null;
  image_urls: string | null;
  specs: string | null;
};

type OfferRow = {
  offer_id: string;
  product_id: string;
  shop_id: string;
  price_toman: number | null;
  last_price_changed_at: string | null;
  warranty: string | null;
  seller_title: string | null;
  shop_name: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  location_label: string | null;
  website_url: string | null;
  instagram: string | null;
  supports_fast_delivery: number | null;
  payment_options: string | null;
  weekly_hours: string | null;
  c_thread_id: string | null;
  c_status: string | null;
  c_requested_at: string | null;
  c_confirmed_at: string | null;
  c_confirmed_price: number | null;
  c_confirmed_hours: string | null;
  c_note: string | null;
};

const STOPWORDS = new Set([
  "میخوام", "می‌خوام", "میخواهم", "می‌خواهم", "گوشی", "مدل", "با", "برای", "تا", "از",
  "یه", "یک", "و", "یا", "که", "هم", "باشه", "خوبه", "تومان", "تومن", "میلیون", "میلیارد",
  "هزار", "حافظه", "رم", "گیگابایت", "گیرم", "بخرم", "خرید", "قیمت", "فروشگاه", "نزدیک",
  "امروز", "فردا", "الان", "فردوسی", "شیخ", "هادی", "علاءالدین", "تهران", "قسطی", "اعتباری",
]);

const AREA_CENTERS: Record<string, { lat: number; lon: number }> = {
  "فردوسی و شیخ هادی": { lat: 35.6949, lon: 51.4118 },
  "فردوسی": { lat: 35.6949, lon: 51.4125 },
  "شیخ هادی": { lat: 35.695, lon: 51.411 },
  "همه تهران": { lat: 35.6892, lon: 51.389 },
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function paymentsFrom(raw: string | null | undefined): PaymentProvider[] {
  const rows = parseJson<Record<string, unknown>[]>(raw, []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((p) => ({
      providerName: String(p.provider_name ?? "").trim(),
      channel: p.channel ? String(p.channel) : null,
    }))
    .filter((p) => p.providerName.length > 0);
}

function warrantyFrom(raw: string | null | undefined): { months: number | null; label: string | null } {
  const data = parseJson<Record<string, unknown>>(raw, {});
  const period = Number(data.period_months);
  const description = typeof data.description === "string" ? data.description : null;
  if (Number.isFinite(period) && period > 0) {
    return { months: period, label: description ?? `گارانتی ${toFaDigits(period)} ماه` };
  }
  if (description) {
    const match = /(\d{1,2})\s*ماه/.exec(description);
    if (match) return { months: Number(match[1]), label: description };
    return { months: null, label: description };
  }
  return { months: null, label: null };
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function productFromRow(row: ProductRow): ProductSummary {
  return {
    productId: row.product_id,
    title: row.persian_title ?? "محصول بدون عنوان",
    brand: row.brand_name,
    category: row.category_name,
    categoryGroup: row.category_group,
    model: row.model,
    images: parseJson<string[]>(row.image_urls, []),
    specs: parseJson<{ key: string; value: string }[]>(row.specs, []),
    offerCount: 0,
    shopCount: 0,
    minPrice: null,
    maxPrice: null,
  };
}

function shopFromRow(row: OfferRow): Shop {
  return {
    shopId: row.shop_id,
    name: row.shop_name ?? "فروشگاه بدون نام",
    address: shortAddress(row.address),
    lat: row.lat,
    lon: row.lon,
    locationLabel: row.location_label,
    websiteUrl: row.website_url,
    instagram: row.instagram,
    fastDelivery: row.supports_fast_delivery === 1,
    payments: paymentsFrom(row.payment_options),
  };
}

function confirmationFromRow(row: OfferRow): Confirmation | null {
  if (!row.c_thread_id) return null;
  const status = row.c_status ?? "pending";
  return {
    threadId: row.c_thread_id,
    status: status as Confirmation["status"],
    requestedAt: row.c_requested_at,
    confirmedAt: row.c_confirmed_at,
    confirmedPrice: row.c_confirmed_price,
    confirmedHours: row.c_confirmed_hours,
    note: row.c_note,
  };
}

export function searchProductCandidates(
  query: string,
  group: CategoryGroup,
  limit = 12,
): ProductSummary[] {
  const db = getDb();
  const normalized = normalizeText(query);
  const tokens = normalized
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .slice(0, 8);

  let rows: ProductRow[] = [];

  if (tokens.length === 0) {
    const groupClause = group === "other" ? "" : "AND p.category_group = @group";
    rows = db
      .prepare(
        `SELECT p.* FROM products p
         JOIN offers o ON o.product_id = p.product_id
         WHERE 1=1 ${groupClause}
         GROUP BY p.product_id
         ORDER BY COUNT(*) DESC
         LIMIT @limit`,
      )
      .all({ group, limit }) as ProductRow[];
  } else {
    const groupClause = group === "other" ? "" : "AND p.category_group = @group";
    const knownBrandTokens = tokens.filter((t) =>
      ["سامسونگ", "اپل", "شیائومی", "نوکیا", "کاسیو", "سیتیزن", "تیسوت", "جولیوس", "سونی", "هوآوی", "آنر", "گوگل", "موتورولا", "ریلمی"].includes(t),
    );
    const storageNumbers = new Set([32, 64, 128, 256, 512, 1024]);
    const modelTokens = tokens.filter(
      (t) => /[a-z]/.test(t) || (Number.isFinite(Number(t)) && storageNumbers.has(Number(t))),
    );
    const descriptorTokens = tokens.filter((t) =>
      ["مردانه", "زنانه", "هوشمند", "مدرن", "ساده", "بزرگ", "کوچک", "شارژی", "صنعتی", "خانگی"].includes(t),
    );

    const tryFts = (terms: string[]) => {
      if (terms.length === 0) return [] as ProductRow[];
      const ftsQuery = terms.map((t) => `"${t}"*`).join(" AND ");
      try {
        return db
          .prepare(
            `SELECT p.* FROM products_fts f
             JOIN products p ON p.product_id = f.product_id
             WHERE products_fts MATCH @fts ${groupClause}
             ORDER BY bm25(products_fts)
             LIMIT 60`,
          )
          .all({ fts: ftsQuery, group }) as ProductRow[];
      } catch {
        return [] as ProductRow[];
      }
    };

    const modelAndBrand = [...new Set([...modelTokens, ...knownBrandTokens, ...descriptorTokens])];
    rows = tryFts(modelAndBrand);
    if (rows.length === 0) rows = tryFts(tokens);
    if (rows.length === 0) {
      const orQuery = tokens.map((t) => `"${t}"*`).join(" OR ");
      try {
        rows = db
          .prepare(
            `SELECT p.* FROM products_fts f
             JOIN products p ON p.product_id = f.product_id
             WHERE products_fts MATCH @fts ${groupClause}
             ORDER BY bm25(products_fts)
             LIMIT 60`,
          )
          .all({ fts: orQuery, group }) as ProductRow[];
      } catch {
        rows = [];
      }
    }

    if (rows.length === 0) {
      const likeTerms = modelAndBrand.length ? modelAndBrand : tokens;
      const like = `%${likeTerms.join("%")}%`;
      rows = db
        .prepare(
          `SELECT p.* FROM products p
           JOIN offers o ON o.product_id = p.product_id
           WHERE p.search_text LIKE @like ${groupClause}
           GROUP BY p.product_id
           ORDER BY COUNT(*) DESC
           LIMIT 60`,
        )
        .all({ like, group }) as ProductRow[];
    }
  }

  const ids = rows.map((r) => r.product_id);
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const stats = db
    .prepare(
      `SELECT product_id, COUNT(*) AS offers, COUNT(DISTINCT shop_id) AS shops,
              MIN(price_toman) AS min_price, MAX(price_toman) AS max_price
       FROM offers WHERE product_id IN (${placeholders}) AND price_toman IS NOT NULL
       GROUP BY product_id`,
    )
    .all(...ids) as {
    product_id: string;
    offers: number;
    shops: number;
    min_price: number;
    max_price: number;
  }[];
  const byId = new Map(stats.map((s) => [s.product_id, s]));

  return rows
    .map((row) => {
      const product = productFromRow(row);
      const stat = byId.get(row.product_id);
      product.offerCount = stat?.offers ?? 0;
      product.shopCount = stat?.shops ?? 0;
      product.minPrice = stat?.min_price ?? null;
      product.maxPrice = stat?.max_price ?? null;
      const exactCategory = group === "phone" && row.category_name === "گوشی موبایل" ? 0 : 1;
      const phoneShape = group === "phone" && !/^گوشی/.test(row.persian_title ?? "") ? 1 : 0;
      const accessoryWord = /(فیلتر|کیسه|قاب|کاور|گلس|لوازم یدکی|شارژر|کابل|باتری|باطری|یدکی|موتور|قطعات|برد|سنسور)/.exec(
        row.persian_title ?? "",
      )?.[0];
      const accessoryPenalty = accessoryWord && !normalized.includes(accessoryWord) ? 1 : 0;
      return { product, exactCategory, phoneShape, accessoryPenalty };
    })
    .filter((x) => x.product.offerCount > 0)
    .sort((a, b) => {
      if (a.accessoryPenalty !== b.accessoryPenalty) return a.accessoryPenalty - b.accessoryPenalty;
      if (a.exactCategory !== b.exactCategory) return a.exactCategory - b.exactCategory;
      if (a.phoneShape !== b.phoneShape) return a.phoneShape - b.phoneShape;
      return b.product.offerCount - a.product.offerCount;
    })
    .slice(0, limit)
    .map((x) => x.product);
}

export function getProductSummary(productId: string): ProductSummary | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM products WHERE product_id = ?").get(productId) as
    | ProductRow
    | undefined;
  if (!row) return null;
  const product = productFromRow(row);
  const stat = db
    .prepare(
      `SELECT COUNT(*) AS offers, COUNT(DISTINCT shop_id) AS shops,
              MIN(price_toman) AS min_price, MAX(price_toman) AS max_price
       FROM offers WHERE product_id = ? AND price_toman IS NOT NULL`,
    )
    .get(productId) as { offers: number; shops: number; min_price: number; max_price: number };
  product.offerCount = stat.offers;
  product.shopCount = stat.shops;
  product.minPrice = stat.min_price;
  product.maxPrice = stat.max_price;
  return product;
}

export function getOffers(productId: string, intent: Intent): { offers: OfferWithShop[]; facets: Facets } {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT o.offer_id, o.product_id, o.shop_id, o.price_toman, o.last_price_changed_at,
              o.warranty, o.seller_title,
              s.name AS shop_name, s.address, s.lat, s.lon, s.location_label,
              s.website_url, s.instagram, s.supports_fast_delivery, s.payment_options,
              s.weekly_hours,
              c.thread_id AS c_thread_id, c.status AS c_status, c.requested_at AS c_requested_at,
              c.confirmed_at AS c_confirmed_at, c.confirmed_price AS c_confirmed_price,
              c.confirmed_hours AS c_confirmed_hours, c.note AS c_note
       FROM offers o
       JOIN shops s ON s.shop_id = o.shop_id
       LEFT JOIN confirmations c ON c.id = (
         SELECT c2.id FROM confirmations c2
         WHERE c2.product_id = o.product_id AND c2.shop_id = o.shop_id
         ORDER BY c2.id DESC LIMIT 1
       )
       WHERE o.product_id = ?`,
    )
    .all(productId) as OfferRow[];

  const center =
    intent.area.lat != null && intent.area.lon != null
      ? { lat: intent.area.lat, lon: intent.area.lon }
      : AREA_CENTERS[intent.area.label] ??
        (intent.area.label === "همه تهران"
          ? null
          : (() => {
              const row = db
                .prepare(
                  `SELECT AVG(lat) AS lat, AVG(lon) AS lon FROM shops
                   WHERE location_label = ? AND lat IS NOT NULL AND lon IS NOT NULL`,
                )
                .get(intent.area.label) as { lat: number | null; lon: number | null } | undefined;
              return row && row.lat != null && row.lon != null
                ? { lat: row.lat, lon: row.lon }
                : null;
            })());

  let offers: OfferWithShop[] = rows.map((row) => {
    const shop = shopFromRow(row);
    const warranty = warrantyFrom(row.warranty);
    const hours = getHoursStatus(row.weekly_hours);
    const distance =
      center && shop.lat != null && shop.lon != null
        ? distanceKm(center.lat, center.lon, shop.lat, shop.lon)
        : null;
    return {
      offerId: row.offer_id,
      productId: row.product_id,
      price: row.price_toman,
      lastPriceChangedAt: row.last_price_changed_at,
      warrantyMonths: warranty.months,
      warrantyLabel: warranty.label,
      sellerTitle: row.seller_title,
      shop,
      hours,
      distanceKm: distance,
      hasCredit: shop.payments.length > 0,
      confirmation: confirmationFromRow(row),
      score: 0,
      reasons: [],
    };
  });

  if (intent.area.label === "فردوسی و شیخ هادی") {
    offers = offers.filter((o) => ["فردوسی", "شیخ هادی"].includes(o.shop.locationLabel ?? ""));
  } else if (intent.area.lat != null && intent.area.lon != null) {
    offers = offers.filter((o) => o.distanceKm != null && o.distanceKm <= intent.area.radiusKm);
  } else if (intent.area.label !== "همه تهران") {
    const knownArea = db
      .prepare("SELECT 1 AS found FROM shops WHERE location_label = ? LIMIT 1")
      .get(intent.area.label);
    offers = knownArea
      ? offers.filter((o) => o.shop.locationLabel === intent.area.label)
      : [];
  }

  if (intent.budgetMaxToman != null) {
    offers = offers.filter((o) => o.price == null || o.price <= intent.budgetMaxToman!);
  }

  const facets: Facets = {
    paymentCount: offers.filter((o) => o.hasCredit).length,
    openNowCount: offers.filter((o) => o.hours.state === "open").length,
    confirmedCount: offers.filter((o) => o.confirmation?.status === "confirmed").length,
  };

  if (intent.payment.requireCredit) offers = offers.filter((o) => o.hasCredit);
  if (intent.openNow) offers = offers.filter((o) => o.hours.state === "open");

  return { offers: rankOffers(offers, intent), facets };
}

export function search(intent: Intent, productId?: string): SearchResult | null {
  if (productId) {
    const product = getProductSummary(productId);
    if (!product) return null;
    const { offers, facets } = getOffers(product.productId, intent);
    return { product, offers, facets };
  }

  const candidates = searchProductCandidates(intent.rawText, intent.category, 12);
  for (const product of candidates) {
    const { offers, facets } = getOffers(product.productId, intent);
    if (offers.length > 0) return { product, offers, facets };
  }
  return null;
}

export function searchAlternatives(
  product: ProductSummary,
  intent: Intent,
  excludeShopIds: string[],
): OfferWithShop[] {
  const db = getDb();
  const siblingRows = db
    .prepare(
      `SELECT p.* FROM products_fts f
       JOIN products p ON p.product_id = f.product_id
       WHERE products_fts MATCH @fts AND p.product_id != @productId
         AND p.category_group = @group
       ORDER BY bm25(products_fts) LIMIT 8`,
    )
    .all({
      fts: [product.brand, product.model].filter(Boolean).map((t) => `"${normalizeText(t!)}"*`).join(" OR ") || `"${normalizeText(product.title)}"*`,
      productId: product.productId,
      group: product.categoryGroup,
    }) as ProductRow[];

  const candidates = [product, ...siblingRows.map(productFromRow)];
  const seen = new Set<string>();
  const results: OfferWithShop[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.productId)) continue;
    seen.add(candidate.productId);
    const { offers } = getOffers(candidate.productId, intent);
    for (const offer of offers) {
      if (excludeShopIds.includes(offer.shop.shopId)) continue;
      if (offer.price == null) continue;
      if (intent.budgetMaxToman != null && offer.price > intent.budgetMaxToman) continue;
      results.push(offer);
    }
    if (results.length >= 8) break;
  }

  return rankOffers(results, intent).slice(0, 4);
}
