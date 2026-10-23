import { normalizeText, toEnDigits } from "./format";
import { llmJson } from "./llm";
import type { CategoryGroup, Intent } from "./types";

const BRANDS = [
  "سامسونگ", "اپل", "شیائومی", "نوکیا", "هوآوی", "آنر", "گوگل", "موتورولا", "ریلمی",
  "کاسیو", "سیتیزن", "تیسوت", "جولیوس", "پارس شعاع توس", "شیله", "اپتونیکا", "سونی",
  "ال جی", "بوش", "فیلیپس", "اینتل", "ایسوس", "لنوو", "مک بوک",
];

const PAYMENT_PROVIDERS = ["ترب‌پی", "اسنپ‌پی", "دیجی‌پی", "تارا", "ازکی‌وام", "ازکی وام"];

const CATEGORY_LABELS: Record<CategoryGroup, string> = {
  phone: "گوشی",
  watch: "ساعت",
  lighting: "روشنایی",
  home: "لوازم خانگی",
  tools: "ابزار و برق",
  other: "محصول",
};

export type IntentDetection = {
  category: CategoryGroup | null;
  categoryLabel: string | null;
  areaLabel: string | null;
};

function detectCategory(text: string): CategoryGroup {
  if (/گوشی|موبایل|آیفون|iphone|samsung|سامسونگ|شیائومی|پیکسل/i.test(text)) return "phone";
  if (/ساعت|کاسیو|سیتیزن|تیسوت|جولیوس/i.test(text)) return "watch";
  if (/لوستر|چراغ|لامپ|روشنایی|پنل|وال واشر|پروژکتور/i.test(text)) return "lighting";
  if (/جارو|پمپ|کولر|پکیج|شوفاژ|لوازم خانگی|یخچال|ماشین لباسشویی/i.test(text)) return "home";
  if (/کابل|سیم|کلید|پریز|فیوز|ابزار|دوربین مدار|رله|کنتاکتور/i.test(text)) return "tools";
  return "other";
}

function detectBrand(text: string): string | undefined {
  return BRANDS.find((brand) => text.includes(brand));
}

function detectModel(text: string): string | undefined {
  const lowered = text.toLowerCase();
  const sFe = /s\s*(\d{2})\s*fe/i.exec(lowered);
  if (sFe) return `S${sFe[1]} FE`;
  const samsungA = /(?:سامسونگ|samsung)?\s*a\s*(\d{2})\b/i.exec(lowered);
  if (samsungA) return `A${samsungA[1]}`;
  const iphone = /(?:آیفون|iphone)\s*(\d{1,2})(?:\s*(pro|max|plus))?/i.exec(lowered);
  if (iphone) {
    const suffix = iphone[2] ? ` ${iphone[2].toUpperCase()}` : "";
    return `iPhone ${iphone[1]}${suffix}`;
  }
  const redmi = /(?:redmi|ردمی|شیائومی)\s*([a-z0-9 ]{2,24})/i.exec(lowered);
  if (redmi) return redmi[1].trim().toUpperCase();
  return undefined;
}

function detectStorage(text: string): number | undefined {
  const match = /(?:حافظه|ظرفیت|storage)?\s*(\d{2,4})\s*(?:گیگ|gb|گیگابایت)/i.exec(toEnDigits(text));
  if (match) {
    const value = Number(match[1]);
    if ([32, 64, 128, 256, 512, 1024].includes(value)) return value;
  }
  const bare = /\b(64|128|256|512)\b/.exec(toEnDigits(text));
  return bare ? Number(bare[1]) : undefined;
}

function detectBudget(text: string): number | undefined {
  const normalized = toEnDigits(text).replace(/[٬,]/g, "");
  const match = /(?:تا|زیر|حدود|بودجه|سقف)\s*(\d+(?:\.\d+)?)\s*(میلیون|میلیارد|هزار)?/.exec(normalized);
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "میلیارد") return Math.round(value * 1_000_000_000);
  if (unit === "میلیون") return Math.round(value * 1_000_000);
  if (unit === "هزار") return Math.round(value * 1_000);
  return value > 1_000_000 ? Math.round(value) : undefined;
}

function detectAreaLabel(text: string): string | null {
  if (/نزدیک من|این اطراف|همین حوالی/.test(text)) return "نزدیک من";
  if (/همه تهران|کل تهران|هر جای تهران/.test(text)) return "همه تهران";
  if (/فردوسی|شیخ هادی|علاءالدین|پاساژ|بازار موبایل|جمهوری/.test(text)) {
    return "فردوسی و شیخ هادی";
  }
  return null;
}

function canonicalAreaLabel(label: string): string {
  const trimmed = label.trim();
  if (/همه تهران|کل تهران|هر جای تهران/.test(trimmed)) return "همه تهران";
  if (/نزدیک من|این اطراف|همین حوالی/.test(trimmed)) return "نزدیک من";
  if (/فردوسی|شیخ هادی|علاءالدین|پاساژ|بازار موبایل|جمهوری/.test(trimmed)) {
    return "فردوسی و شیخ هادی";
  }
  return trimmed;
}

function areaRadius(label: string): number {
  if (label === "همه تهران") return 30;
  if (label === "نزدیک من") return 5;
  return 4;
}

function mentionsArea(text: string, label: string): boolean {
  const normalized = normalizeText(text);
  if (label === "نزدیک من") return /نزدیک من|اطراف|حوالی/.test(normalized);
  if (label === "همه تهران") return /تهران/.test(normalized);
  if (label === "فردوسی و شیخ هادی") {
    return /فردوسی|شیخ هادی|علاءالدین|پاساژ|جمهوری/.test(normalized);
  }
  const tokens = normalizeText(label)
    .split(" ")
    .filter((token) => token.length >= 3);
  return tokens.length > 0 && tokens.some((token) => normalized.includes(token));
}

function detectArea(text: string): Intent["area"] {
  const label = detectAreaLabel(text) ?? "فردوسی و شیخ هادی";
  return { label, radiusKm: areaRadius(label) };
}

function detectPayment(text: string): Intent["payment"] {
  const providers = PAYMENT_PROVIDERS.filter((p) => text.includes(p));
  const credit = /قسطی|اقساط|اعتباری|ترب‌پی|اسنپ‌پی|دیجی‌پی|تارا|ازکی/.test(text);
  const requireCredit = /فقط\s*(?:قسطی|اعتباری)|فقط.*پرداخت/.test(text);
  return { creditPreferred: credit, requireCredit, providers };
}

function detectWarranty(text: string): number | undefined {
  const match = /گارانتی\s*(\d{1,2})\s*ماه/.exec(toEnDigits(text));
  return match ? Number(match[1]) : undefined;
}

function detectDeadline(text: string): Intent["deadline"] | undefined {
  if (/امروز|همین امروز/.test(text)) return "today";
  if (/فردا/.test(text)) return "tomorrow";
  if (/این هفته|آخر هفته/.test(text)) return "this_week";
  return undefined;
}

export function fallbackIntent(text: string, current?: Partial<Intent>): Intent {
  const category = detectCategory(text);
  const budget = detectBudget(text);
  const payment = detectPayment(text);
  return {
    rawText: text,
    category: category === "other" && current?.category ? current.category : category,
    brand: detectBrand(text) ?? current?.brand,
    model: detectModel(text) ?? current?.model,
    variant: {
      ...(current?.variant ?? {}),
      ...(detectStorage(text) ? { storageGb: detectStorage(text) } : {}),
    },
    budgetMaxToman: budget ?? current?.budgetMaxToman,
    area: detectArea(text),
    payment,
    warrantyMinMonths: detectWarranty(text) ?? current?.warrantyMinMonths,
    openNow: /الان|همین حالا|باز\b/.test(text) || (current?.openNow ?? false),
    deadline: detectDeadline(text),
  };
}

function coerceIntent(raw: Record<string, unknown>, fallback: Intent): Intent {
  const categories: CategoryGroup[] = ["phone", "watch", "lighting", "home", "tools", "other"];
  const category = categories.includes(raw.category as CategoryGroup)
    ? (raw.category as CategoryGroup)
    : fallback.category;

  const variantRaw = (raw.variant ?? {}) as Record<string, unknown>;
  const variant = {
    ...fallback.variant,
    ...(Number(variantRaw.storageGb) > 0 ? { storageGb: Number(variantRaw.storageGb) } : {}),
    ...(Number(variantRaw.ramGb) > 0 ? { ramGb: Number(variantRaw.ramGb) } : {}),
    ...(typeof variantRaw.color === "string" ? { color: variantRaw.color } : {}),
    ...(typeof variantRaw.condition === "string"
      ? { condition: variantRaw.condition as "new" | "used" | "stock" }
      : {}),
  };

  const areaRaw = (raw.area ?? {}) as Record<string, unknown>;
  const rawAreaLabel = typeof areaRaw.label === "string" ? areaRaw.label.trim() : "";
  const areaLabel = rawAreaLabel
    ? canonicalAreaLabel(rawAreaLabel)
    : fallback.area.label;
  const rawRadius = Number(areaRaw.radiusKm);
  const area = {
    label: areaLabel,
    radiusKm:
      Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : areaRadius(areaLabel),
  };

  const paymentRaw = (raw.payment ?? {}) as Record<string, unknown>;
  const payment = {
    creditPreferred:
      typeof paymentRaw.creditPreferred === "boolean"
        ? paymentRaw.creditPreferred
        : fallback.payment.creditPreferred,
    requireCredit:
      typeof paymentRaw.requireCredit === "boolean"
        ? paymentRaw.requireCredit
        : fallback.payment.requireCredit,
    providers: Array.isArray(paymentRaw.providers)
      ? paymentRaw.providers.filter((p): p is string => typeof p === "string")
      : fallback.payment.providers,
  };

  const budget = Number(raw.budgetMaxToman);
  const warranty = Number(raw.warrantyMinMonths);
  return {
    rawText: fallback.rawText,
    category,
    brand: typeof raw.brand === "string" && raw.brand.trim() ? raw.brand.trim() : fallback.brand,
    model: typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : fallback.model,
    variant,
    budgetMaxToman: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : fallback.budgetMaxToman,
    area,
    payment,
    warrantyMinMonths: Number.isFinite(warranty) && warranty > 0 ? warranty : fallback.warrantyMinMonths,
    openNow: typeof raw.openNow === "boolean" ? raw.openNow : fallback.openNow,
    deadline:
      raw.deadline === "today" || raw.deadline === "tomorrow" || raw.deadline === "this_week"
        ? raw.deadline
        : fallback.deadline,
  };
}

export async function parseIntents(
  text: string,
  current?: Partial<Intent>,
): Promise<{
  intent: Intent;
  missing: string[];
  usedLlm: boolean;
  detected: IntentDetection;
}> {
  const fallback = fallbackIntent(text, current);
  const llm = await llmJson<Record<string, unknown>>({
    system: `تو یک تحلیل‌گر نیت خرید فارسی هستی. فقط JSON برگردان.
فیلدها: category (phone|watch|lighting|home|tools|other)، categoryLabel (نام فارسی دسته)،
brand، model، variant {storageGb, ramGb, color, condition}، budgetMaxToman (عدد تومان)،
area {label, radiusKm}، payment {creditPreferred, requireCredit, providers}،
warrantyMinMonths، openNow، deadline (today|tomorrow|this_week).
هیچ چیزی از خودت نساز. اگر چیزی در متن نبود null بگذار. بودجه‌ی «۲۰۰ میلیون» را 200000000 برگردان.
اگر محصول در دسته‌های بالا نیست category را other و categoryLabel را نام کوتاه فارسی محصول بگذار.
دسته را از کلمات فارسی تشخیص بده: گوشی/موبایل phone، ساعت watch، چراغ/لوستر lighting،
لوازم خانگی home، ابزار/کابل/کلید tools.
area.label را فقط وقتی بگذار که محدوده صریحاً در متن آمده باشد؛ می‌تواند نام محله باشد (مثلاً «میرداماد»)، وگرنه null.`,
    user: text,
    timeoutMs: 7000,
    maxTokens: 600,
  });

  const intent = llm ? coerceIntent(llm, fallback) : fallback;

  const categories: CategoryGroup[] = ["phone", "watch", "lighting", "home", "tools", "other"];
  const llmCategory =
    llm && categories.includes(llm.category as CategoryGroup)
      ? (llm.category as CategoryGroup)
      : null;
  const llmCategoryLabel =
    llm && typeof llm.categoryLabel === "string" && llm.categoryLabel.trim()
      ? llm.categoryLabel.trim()
      : null;
  const regexCategory = detectCategory(text);
  const detectedCategory: CategoryGroup | null =
    llmCategory && llmCategory !== "other"
      ? llmCategory
      : regexCategory !== "other"
        ? regexCategory
        : llmCategory === "other" && llmCategoryLabel
          ? "other"
          : null;
  const detectedCategoryLabel =
    llmCategoryLabel ?? (detectedCategory ? CATEGORY_LABELS[detectedCategory] : null);

  const regexArea = detectAreaLabel(text);
  const llmAreaRaw =
    llm && typeof (llm.area as Record<string, unknown> | undefined)?.label === "string"
      ? String((llm.area as Record<string, unknown>).label).trim()
      : "";
  const llmAreaLabel = llmAreaRaw ? canonicalAreaLabel(llmAreaRaw) : "";
  const detectedAreaLabel =
    regexArea ?? (llmAreaLabel && mentionsArea(text, llmAreaLabel) ? llmAreaLabel : null);

  const missing: string[] = [];
  if (intent.category === "other" && !intent.model) missing.push("دسته محصول");
  if (!intent.model && !intent.brand) missing.push("مدل یا برند");
  if (!intent.area.label) missing.push("محدوده");
  return {
    intent,
    missing,
    usedLlm: Boolean(llm),
    detected: {
      category: detectedCategory,
      categoryLabel: detectedCategoryLabel,
      areaLabel: detectedAreaLabel,
    },
  };
}
