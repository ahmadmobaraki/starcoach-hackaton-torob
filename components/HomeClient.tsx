"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Lightbulb,
  Map,
  MapPin,
  Search,
  Smartphone,
  Wallet,
  Watch,
  Wrench,
  House,
} from "lucide-react";
import type { CategoryGroup, Intent, SearchResult } from "@/lib/types";
import { DEMO_QUERY } from "@/lib/demo";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
});

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
  const [coordsSource, setCoordsSource] = useState<"gps" | "map" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
      setCoordsSource(null);
      return;
    }
    if (!navigator.geolocation) {
      setError("مرورگر شما موقعیت مکانی را پشتیبانی نمی‌کند؛ نقطه‌ی محدوده را روی نقشه انتخاب کن.");
      setPickerOpen(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setCoordsSource("gps");
        setAreaLabel("نزدیک من");
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("دسترسی به موقعیت مکانی داده نشد؛ نقطه‌ی محدوده را روی نقشه انتخاب کن.");
        setPickerOpen(true);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function confirmPickedPoint(lat: number, lon: number) {
    setCoords({ lat, lon });
    setCoordsSource("map");
    setAreaLabel("نزدیک من");
    setError(null);
    setPickerOpen(false);
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
        <form
          onSubmit={submit}
          className="mt-6 rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5"
        >
          <label htmlFor="request" className="text-sm font-bold">
            همه فروشگاه‌های محل، کف دست شما!
          </label>
          <textarea
            id="request"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={1}
            placeholder="مثلاً: گوشی سامسونگ S25 FE ۲۵۶ تا ۲۰۰ میلیون، فردوسی"
            className="mt-2 w-full resize-none rounded-md border border-line bg-bg px-3 py-2.5 text-[15px] leading-7 outline-none transition-colors placeholder:text-muted/80 focus:border-accent"
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
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
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-accent/40 px-3 text-xs text-accent transition-colors hover:bg-accent-soft"
                >
                  <Map size={13} />
                  انتخاب روی نقشه
                </button>
              </div>
              {areaLabel === "نزدیک من" && coordsSource === "map" ? (
                <p className="mt-1.5 text-[10px] leading-5 text-muted">
                  نقطه‌ی انتخابی روی نقشه ثبت شد؛ جست‌وجو در شعاع ۵ کیلومترِ همان نقطه انجام می‌شود.
                </p>
              ) : null}
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

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="دسته محصول">
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

          <label className="mt-10 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={requireCredit}
              onChange={(event) => setRequireCredit(event.target.checked)}
              className="size-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span>فقط خرید اعتباری</span>
          </label>

          {error ? (
            <div className="mt-5 rounded-md bg-danger-soft px-3 py-2 text-xs leading-6 text-danger">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 text-sm font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
      </section>

      {pickerOpen ? (
        <LocationPicker
          initialLat={coords?.lat ?? null}
          initialLon={coords?.lon ?? null}
          onClose={() => setPickerOpen(false)}
          onConfirm={confirmPickedPoint}
        />
      ) : null}
    </main>
  );
}
