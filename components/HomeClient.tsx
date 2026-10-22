"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Info,
  Lightbulb,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Wallet,
  Watch,
  Wrench,
  House,
} from "lucide-react";
import type { CategoryGroup, Intent, SearchResult } from "@/lib/types";
import { DEMO_QUERY } from "@/lib/demo";
import { formatNumber } from "@/lib/format";

type CategoryOption = {
  id: CategoryGroup;
  label: string;
  example: string;
  icon: React.ReactNode;
};

const CATEGORIES: CategoryOption[] = [
  {
    id: "phone",
    label: "گوشی",
    example: DEMO_QUERY,
    icon: <Smartphone size={15} />,
  },
  {
    id: "watch",
    label: "ساعت",
    example: "یه ساعت کاسیو مردانه می‌خوام، تا ۶۰ میلیون، فردوسی.",
    icon: <Watch size={15} />,
  },
  {
    id: "lighting",
    label: "روشنایی",
    example: "یه لوستر مدرن برای پذیرایی می‌خوام، تا ۵ میلیون.",
    icon: <Lightbulb size={15} />,
  },
  {
    id: "home",
    label: "لوازم خانگی",
    example: "یه پمپ آب خانگی می‌خوام، تا ۱۵ میلیون.",
    icon: <House size={15} />,
  },
  {
    id: "tools",
    label: "ابزار و برق",
    example: "یه کلید فیوز مینیاتوری ۲۵ آمپر می‌خوام.",
    icon: <Wrench size={15} />,
  },
];

const AREAS = ["فردوسی و شیخ هادی", "همه تهران", "نزدیک من"];

export function HomeClient() {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryGroup>("phone");
  const [text, setText] = useState("");
  const [areaLabel, setAreaLabel] = useState("فردوسی و شیخ هادی");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [budgetMillion, setBudgetMillion] = useState("");
  const [requireCredit, setRequireCredit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseCategory(option: CategoryOption) {
    setCategory(option.id);
    if (!text.trim() || CATEGORIES.some((c) => c.example === text)) {
      setText(option.example);
    }
  }

  async function chooseArea(label: string) {
    setError(null);
    if (label !== "نزدیک من") {
      setAreaLabel(label);
      setCoords(null);
      return;
    }
    if (!navigator.geolocation) {
      setError("مرورگر شما موقعیت مکانی را پشتیبانی نمی‌کند.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setAreaLabel("نزدیک من");
        setLocating(false);
      },
      () => {
        setError("دسترسی به موقعیت مکانی داده نشد. محدوده را دستی انتخاب کنید.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const intentResponse = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!intentResponse.ok) throw new Error("تحلیل درخواست ناموفق بود.");
      const parsed = (await intentResponse.json()) as { intent: Intent; missing: string[] };

      const intent: Intent = {
        ...parsed.intent,
        area:
          areaLabel === "نزدیک من" && coords
            ? { label: "نزدیک من", lat: coords.lat, lon: coords.lon, radiusKm: 5 }
            : { ...parsed.intent.area, label: areaLabel, radiusKm: areaLabel === "همه تهران" ? 30 : 4 },
        payment: { ...parsed.intent.payment, requireCredit },
      };
      if (budgetMillion.trim()) {
        const value = Number(budgetMillion.replace(/[^\d]/g, ""));
        if (Number.isFinite(value) && value > 0) intent.budgetMaxToman = value * 1_000_000;
      }

      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      if (!searchResponse.ok) {
        const payload = (await searchResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "محصولی پیدا نشد.");
      }
      const result = (await searchResponse.json()) as SearchResult;
      sessionStorage.setItem("hamqadam:last", JSON.stringify({ intent, result }));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "چیزی درست پیش نرفت. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
      <section className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-extrabold leading-[1.35] tracking-tight sm:text-[38px]">
              قبل از رفتن،
              <br />
              <span className="text-accent">مطمئن شو.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted">
              می‌گیم کدوم فروشگاه واقعاً داره، چقدر، تا کی بازه — و اگر نبود، کجا بری.
            </p>
          </div>
          <div className="hidden shrink-0 rotate-[-2deg] rounded-lg border border-dashed border-accent/35 bg-accent-soft px-3 py-2 text-center sm:block">
            <div className="text-[11px] text-accent">قیمت ثبت‌شده</div>
            <div className="mt-1 text-sm font-extrabold text-accent">
              {formatNumber(331506)}
            </div>
            <div className="text-[10px] text-accent/80">در ۶٬۴۷۶ فروشگاه</div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="mt-6 rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5"
        >
          <label htmlFor="request" className="text-sm font-bold">
            چی می‌خوای بخری؟
          </label>
          <textarea
            id="request"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            placeholder="مثلاً: گوشی سامسونگ S25 FE ۲۵۶ تا ۲۰۰ میلیون، فردوسی"
            className="mt-2 w-full resize-none rounded-md border border-line bg-bg px-3 py-3 text-[15px] leading-8 outline-none transition-colors placeholder:text-muted/80 focus:border-accent"
          />

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="دسته محصول">
            {CATEGORIES.map((option) => {
              const selected = option.id === category;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseCategory(option)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs transition-colors ${
                    selected
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface text-muted hover:border-accent/40 hover:text-ink"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[11px] text-muted">
                <MapPin size={13} />
                محدوده
              </div>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => chooseArea(area)}
                    aria-pressed={areaLabel === area}
                    className={`min-h-9 whitespace-nowrap rounded-full border px-3 text-xs transition-colors ${
                      areaLabel === area
                        ? "border-ink/20 bg-ink text-white"
                        : "border-line bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    {locating && area === "نزدیک من" ? "در حال یافتن…" : area}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="budget" className="mb-1.5 flex items-center gap-1 text-[11px] text-muted">
                <Wallet size={13} />
                سقف بودجه (میلیون تومان)
              </label>
              <input
                id="budget"
                inputMode="numeric"
                value={budgetMillion}
                onChange={(event) => setBudgetMillion(event.target.value)}
                placeholder="۲۰۰"
                className="min-h-10 w-full rounded-md border border-line bg-bg px-3 text-sm outline-none transition-colors focus:border-accent sm:w-36"
              />
            </div>
          </div>

          <label className="mt-3 flex items-start gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={requireCredit}
              onChange={(event) => setRequireCredit(event.target.checked)}
              className="mt-1 size-4 accent-[var(--color-accent)]"
            />
            <span>
              فقط فروشگاه‌هایی که پرداخت اعتباری دارند
              <span className="mx-1 text-line">·</span>
              در این دیتاست کم هستند؛ اگر چیزی پیدا نشد، خاموشش کن.
            </span>
          </label>

          {error ? (
            <div className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs leading-6 text-danger">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 text-sm font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-accent-ink/35 border-t-accent-ink" />
                دستیار درخواست را می‌خواند…
              </>
            ) : (
              <>
                <Search size={17} />
                فروشگاه‌ها را پیدا کن
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] leading-5 text-muted">
            قیمت‌ها ثبت‌شده‌اند؛ موجودی را قبل از رفتن از فروشگاه می‌پرسیم.
          </p>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles size={13} className="text-accent" />
            نمونه:
          </span>
          {[CATEGORIES[0], CATEGORIES[1], CATEGORIES[2]].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setCategory(option.id);
                setText(option.example);
              }}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-ink"
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCategory("phone");
              setText(DEMO_QUERY);
            }}
            className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent"
          >
            دموی آماده
          </button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold">یک سفر خرید، بدون سه بار «نداریم»</h2>
        <div className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
          {[
            {
              icon: <Search size={18} />,
              title: "دقیق می‌فهمیم چه می‌خواهی",
              text: "مدل، حافظه، بودجه، محدوده و شرایط پرداخت را از جمله‌ی فارسی درمی‌آوریم.",
            },
            {
              icon: <Store size={18} />,
              title: "از فروشگاه می‌پرسیم",
              text: "به چند فروشگاه نزدیک پیام می‌دهیم و پاسخشان را می‌خوانیم؛ نه اینکه قیمت هفته‌ی پیش را «موجود» بنامیم.",
            },
            {
              icon: <BadgeCheck size={18} />,
              title: "برنامه‌ی رفتن می‌سازیم",
              text: "فروشگاه اصلی، جایگزین، ساعت مناسب و چک‌لیست همراهت می‌شود.",
            },
          ].map((row) => (
            <div key={row.title} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 text-accent">{row.icon}</span>
              <div>
                <div className="text-xs font-bold">{row.title}</div>
                <p className="mt-0.5 text-[11px] leading-6 text-muted">{row.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 flex items-start gap-2 rounded-md bg-surface px-4 py-3 text-[11px] leading-6 text-muted ring-1 ring-line">
        <Info size={15} className="mt-1 shrink-0 text-accent" />
        <p>
          این نسخه روی دیتاست نمایشی ترب کار می‌کند. نام و شماره‌ی بخشی از فروشگاه‌ها نمایشی است؛
          قیمت ثبت‌شده با موجودی تأییدشده یکی نیست و هر کدام برچسب جدا دارند.
        </p>
      </section>

      <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <ShieldCheck size={13} />
          تأیید از فروشنده
        </span>
        <span className="text-line">·</span>
        <span className="flex items-center gap-1">
          <Clock size={13} />
          ساعت کاری اعلام‌شده
        </span>
        <span className="text-line">·</span>
        <span className="flex items-center gap-1">
          <ArrowLeft size={13} />
          مسیر و جایگزین
        </span>
      </div>
    </main>
  );
}
