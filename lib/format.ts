const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

export function normalizeText(input: string): string {
  return toEnDigits(input)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function formatNumber(value: number): string {
  return toFaDigits(new Intl.NumberFormat("en-US").format(Math.round(value)).replace(/,/g, "٬"));
}

export function formatToman(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "قیمت نامشخص";
  if (value >= 1_000_000_000) {
    const n = value / 1_000_000_000;
    return `${toFaDigits(n.toFixed(Number.isInteger(n) ? 0 : 1).replace(".", "٫"))} میلیارد تومان`;
  }
  if (value >= 1_000_000) {
    const n = value / 1_000_000;
    return `${toFaDigits(n.toFixed(Number.isInteger(n) ? 0 : 1).replace(".", "٫"))} میلیون تومان`;
  }
  return `${formatNumber(value)} تومان`;
}

export function formatPriceFull(value: number | null | undefined): string {
  if (value == null) return "قیمت نامشخص";
  return `${formatNumber(value)} تومان`;
}

export function relativeTimeFa(iso: string | null | undefined): string {
  if (!iso) return "زمان نامشخص";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "زمان نامشخص";
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 2) return "همین حالا";
  if (minutes < 60) return `${toFaDigits(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toFaDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${toFaDigits(days)} روز پیش`;
  const months = Math.floor(days / 30);
  return `${toFaDigits(months)} ماه پیش`;
}

export function formatDateTimeFa(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeFa(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return "فاصله نامشخص";
  if (km < 1) return `${toFaDigits(Math.round(km * 1000))} متر`;
  return `${toFaDigits(km.toFixed(1).replace(".", "٫"))} کیلومتر`;
}

export function parseToman(input: string): number | null {
  const text = toEnDigits(input)
    .replace(/\u200c/g, " ")
    .replace(/[٬,]/g, "")
    .replace(/\s+/g, " ");
  const million = /(\d+(?:\.\d+)?)\s*(?:میلیون|ملیون|م تومان|م تومنی)/.exec(text);
  if (million) return Math.round(Number(million[1]) * 1_000_000);
  const billion = /(\d+(?:\.\d+)?)\s*(?:میلیارد)/.exec(text);
  if (billion) return Math.round(Number(billion[1]) * 1_000_000_000);
  const thousand = /(\d+(?:\.\d+)?)\s*(?:هزار)\s*(?:تومان|تومن)?/.exec(text);
  if (thousand) return Math.round(Number(thousand[1]) * 1_000);
  const numbers = [...text.matchAll(/\d{6,}/g)].map((m) => Number(m[0])).filter(Number.isFinite);
  if (numbers.length) return Math.max(...numbers);
  return null;
}

export function parseWarrantyMonths(input: string): number | null {
  const text = toEnDigits(input);
  if (/بدون\s*گارانتی|گارانتی\s*ندارد/.test(text)) return 0;
  const match = /(\d{1,2})\s*ماه/.exec(text);
  return match ? Number(match[1]) : null;
}

export function parseClosingTime(input: string): string | null {
  const text = toEnDigits(input).replace(/\u200c/g, " ");
  const match = /(?:تا|ساعت)\s*(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|عصر|شب)?/.exec(text);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3];
  if (suffix === "عصر" || suffix === "شب") {
    if (hour < 12) hour += 12;
  } else if (suffix === "ظهر" && hour < 12) {
    hour += 12;
  } else if (!suffix && hour >= 1 && hour <= 11) {
    hour += 12;
  }
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function shortAddress(address: string | null | undefined): string {
  if (!address) return "آدرس ثبت نشده";
  const parts = address.split("،").map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, 3).join("، ");
}
