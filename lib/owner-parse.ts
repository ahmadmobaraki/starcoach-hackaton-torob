import { parseClosingTime, parseToman, parseWarrantyMonths, toEnDigits } from "./format";
import { llmJson } from "./llm";
import type { OwnerReply } from "./types";

function regexReply(text: string, requestedStorage?: number): OwnerReply {
  const normalized = text.replace(/\u200c/g, " ");
  const unavailable = /تمام\s*شد|تمام شده|نداریم|ناموجود|موجود\s*نیست|نیست\b|تموم\s*شد|تموم شده/.test(normalized);
  const available = /موجود|هست|داریم|موجوده|داره\b/.test(normalized) && !unavailable;

  const price = parseToman(normalized);
  const closesAt = parseClosingTime(normalized);
  const warrantyMonths = parseWarrantyMonths(normalized);

  const storageMatch = /(\d{2,4})\s*(?:گیگ|gb|گیگابایت)/i.exec(toEnDigits(normalized));
  const storage = storageMatch ? Number(storageMatch[1]) : null;
  const alternativeStorage =
    storage && requestedStorage && storage !== requestedStorage ? storage : null;

  const availability = unavailable ? false : available ? true : null;
  let confidence = 0.35;
  if (availability != null) confidence += 0.25;
  if (price != null) confidence += 0.25;
  if (closesAt || warrantyMonths != null) confidence += 0.1;

  return {
    available: availability,
    priceToman: price,
    closesAt,
    warrantyMonths,
    alternativeStorageGb: alternativeStorage,
    alternativeText: alternativeStorage ? `${alternativeStorage} گیگابایت` : null,
    note: text.trim() || null,
    confidence: Math.min(0.95, confidence),
    source: "regex",
  };
}

export async function parseOwnerReply(
  text: string,
  context: { productTitle: string; storageGb?: number; shopName: string },
): Promise<OwnerReply> {
  const fallback = regexReply(text, context.storageGb);
  const llm = await llmJson<Record<string, unknown>>({
    system: `تو پاسخ فروشنده‌ی یک فروشگاه موبایل/کالا را برای دستیار خرید تحلیل می‌کنی. فقط JSON برگردان.
فیلدها: available (true|false|null)، priceToman (عدد تومان یا null)، closesAt (HH:MM یا null)،
warrantyMonths (عدد یا null)، alternativeStorageGb (عدد یا null)، alternativeText (رشته یا null)،
note (خلاصه یک‌خطی)، confidence (0 تا 1).
قواعد: «تمام شده/نداریم/نیست» یعنی available=false. «هست/موجود/داریم» یعنی true.
«تا ۹ شب» یعنی 21:00. «گارانتی ۱۸ ماه» یعنی 18. قیمت را به تومان کامل برگردان.
هیچ عددی را از خودت نساز. اگر مطمئن نیستی null بگذار.`,
    user: `فروشگاه: ${context.shopName}
محصول: ${context.productTitle}
حافظه درخواستی: ${context.storageGb ?? "نامشخص"}
پاسخ فروشنده: ${text}`,
    timeoutMs: 7000,
    maxTokens: 500,
  });

  if (!llm) return fallback;

  const bool = typeof llm.available === "boolean" ? llm.available : fallback.available;
  const price = Number(llm.priceToman);
  const warranty = Number(llm.warrantyMonths);
  const alt = Number(llm.alternativeStorageGb);
  const closes = typeof llm.closesAt === "string" && /^\d{2}:\d{2}$/.test(llm.closesAt)
    ? llm.closesAt
    : fallback.closesAt;
  const confidence = Number(llm.confidence);

  return {
    available: bool,
    priceToman: Number.isFinite(price) && price > 0 ? Math.round(price) : fallback.priceToman,
    closesAt: closes,
    warrantyMonths: Number.isFinite(warranty) && warranty > 0 ? warranty : fallback.warrantyMonths,
    alternativeStorageGb: Number.isFinite(alt) && alt > 0 ? alt : fallback.alternativeStorageGb,
    alternativeText:
      typeof llm.alternativeText === "string" ? llm.alternativeText : fallback.alternativeText,
    note: typeof llm.note === "string" ? llm.note : fallback.note,
    confidence:
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
        ? confidence
        : fallback.confidence,
    source: "llm",
  };
}
