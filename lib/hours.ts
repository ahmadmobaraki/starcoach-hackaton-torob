import { demoNow } from "./clock";
import { toFaDigits } from "./format";
import type { HoursStatus } from "./types";

type Shift = { start_time?: string; end_time?: string };
type Day = { shifts?: Shift[]; status?: string };
type Week = Record<string, Day>;

const DAY_KEYS: Record<string, string> = {
  Sat: "sat",
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
};

function minutes(value: string | undefined): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function hhmm(value: number): string {
  const h = Math.floor(value / 60) % 24;
  const m = value % 60;
  return toFaDigits(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

function tehranNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(demoNow());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    key: DAY_KEYS[weekday] ?? "sat",
    weekday,
    minutes: (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
  };
}

export function getHoursStatus(weeklyJson: string | null | undefined): HoursStatus {
  if (!weeklyJson || weeklyJson === "{}" || weeklyJson === "null") {
    return { state: "unknown", label: "ساعت کاری نامشخص", today: null, source: "missing" };
  }

  let week: Week;
  try {
    week = JSON.parse(weeklyJson) as Week;
  } catch {
    return { state: "unknown", label: "ساعت کاری نامشخص", today: null, source: "missing" };
  }

  const now = tehranNow();
  const today = week[now.key];
  const dayStatus = today?.status;
  if (!today || dayStatus === "unsupported") {
    return { state: "unknown", label: "ساعت کاری نامشخص", today: null, source: "unsupported" };
  }

  const shifts = (today.shifts ?? [])
    .map((s) => ({ start: minutes(s.start_time), end: minutes(s.end_time) }))
    .filter((s): s is { start: number; end: number } => s.start != null && s.end != null)
    .filter((s) => !(s.start === 0 && s.end === 0) && s.start !== s.end)
    .map((s) => ({ start: s.start, end: s.end === 0 ? 24 * 60 : s.end }));

  if (dayStatus === "closed" || shifts.length === 0) {
    return { state: "closed", label: "امروز تعطیل است", today: null, source: "declared" };
  }

  const active = shifts.find((s) => now.minutes >= s.start && now.minutes < s.end);
  if (active) {
    const todayLabel = { open: hhmm(active.start), close: hhmm(active.end) };
    return {
      state: "open",
      label: `باز است تا ${todayLabel.close}`,
      today: todayLabel,
      source: "declared",
    };
  }

  const next = shifts
    .filter((s) => s.start > now.minutes)
    .sort((a, b) => a.start - b.start)[0];

  if (next) {
    return {
      state: "closed",
      label: `از ${hhmm(next.start)} باز می‌شود`,
      today: { open: hhmm(next.start), close: hhmm(next.end) },
      source: "declared",
    };
  }

  const last = shifts[shifts.length - 1];
  return {
    state: "closed",
    label: "امروز بسته است",
    today: { open: hhmm(last.start), close: hhmm(last.end) },
    source: "declared",
  };
}
