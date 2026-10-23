"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  House,
  Lightbulb,
  Map,
  MapPin,
  Package,
  Search,
  Smartphone,
  Wallet,
  Watch,
  Wrench,
} from "lucide-react";
import { formatToman } from "@/lib/format";
import type {
  CategoryGroup,
  Intent,
  SearchFailure,
  SearchResult,
  SearchSuggestion,
} from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
});

type CategoryOption = {
  id: CategoryGroup;
  label: string;
  icon: React.ReactNode;
};

const CATEGORIES: CategoryOption[] = [
  { id: "phone", label: "گوشی", icon: <Smartphone size={15} /> },
  { id: "watch", label: "ساعت", icon: <Watch size={15} /> },
  { id: "lighting", label: "روشنایی", icon: <Lightbulb size={15} /> },
  { id: "home", label: "لوازم خانگی", icon: <House size={15} /> },
  { id: "tools", label: "ابزار و برق", icon: <Wrench size={15} /> },
];

const AREAS = ["نزدیک من", "فردوسی و شیخ هادی", "همه تهران"];

const MIN_AREA_RADIUS_KM = 4;

type ParseResponse = {
  intent: Intent;
  missing: string[];
  detected?: {
    category: CategoryGroup | null;
    categoryLabel: string | null;
    areaLabel: string | null;
  };
};

type PendingSearch = {
  intent: Intent;
  productLabel: string;
  areaLabel: string;
};

type FailureState = SearchFailure & {
  message: string;
  intent: Intent;
  productLabel: string;
  areaLabel: string;
  productId?: string;
};

function areaPhrase(label: string): string {
  if (label === "همه تهران") return "در همه تهران";
  if (label === "نزدیک من") return "در محدوده نزدیک تو";
  return `در محدوده ${label}`;
}

export function HomeClient() {
  const router = useRouter();
  const [category, setCategory] = useState<CategoryGroup | null>(null);
  const [extraCategory, setExtraCategory] = useState<CategoryOption | null>(null);
  const [text, setText] = useState("");
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [coordsSource, setCoordsSource] = useState<"gps" | "map" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [budgetMillion, setBudgetMillion] = useState("");
  const [requireCredit, setRequireCredit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [stage, setStage] = useState<"input" | "confirm">("input");
  const [pending, setPending] = useState<PendingSearch | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [manualCategory, setManualCategory] = useState<CategoryGroup | null>(null);
  const [manualArea, setManualArea] = useState<string | null>(null);
  const [failure, setFailure] = useState<FailureState | null>(null);

  const categoryOptions = extraCategory ? [...CATEGORIES, extraCategory] : CATEGORIES;
  const areaOptions = [...AREAS, ...extraAreas];
  const canSubmit =
    !loading && (text.trim().length > 0 || (category !== null && areaLabel !== null));

  function buildArea(label: string): Intent["area"] {
    if (label === "نزدیک من" && coords) {
      return { label, lat: coords.lat, lon: coords.lon, radiusKm: 5 };
    }
    return {
      label,
      radiusKm: label === "همه تهران" ? 30 : label === "نزدیک من" ? 5 : MIN_AREA_RADIUS_KM,
    };
  }

  function withBudget(intent: Intent): Intent {
    if (!budgetMillion.trim()) return intent;
    const value = Number(budgetMillion.replace(/[^\d]/g, ""));
    if (!Number.isFinite(value) || value <= 0) return intent;
    return { ...intent, budgetMaxToman: value * 1_000_000 };
  }

  function chooseCategory(option: CategoryOption) {
    setCategory(option.id);
    if (correcting) setManualCategory(option.id);
    setFailure(null);
    setHint(null);
  }

  async function chooseArea(label: string) {
    setError(null);
    setHint(null);
    setFailure(null);
    if (label !== "نزدیک من") {
      setAreaLabel(label);
      if (correcting) setManualArea(label);
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
        if (correcting) setManualArea("نزدیک من");
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
    if (correcting) setManualArea("نزدیک من");
    setHint(null);
    setFailure(null);
    setError(null);
    setPickerOpen(false);
  }

  function requestMissingHint(missingProduct: boolean, missingArea: boolean): string {
    if (missingProduct && missingArea) return "لطفاً محصول و محدوده را دقیق‌تر مشخص کن.";
    if (missingProduct) return "لطفاً مشخص کن دنبال چه محصولی هستی.";
    return "لطفاً محدوده را دقیق‌تر مشخص کن.";
  }

  async function prepareSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setHint(null);
    setFailure(null);

    const typed = text.trim();

    if (!typed) {
      if (!category || !areaLabel) return;
      const option = categoryOptions.find((item) => item.id === category);
      const context = {
        productLabel: option?.label ?? "این محصول",
        areaLabel,
      };
      const intent = withBudget({
        rawText: category === "other" ? option?.label ?? "" : "",
        category,
        area: buildArea(areaLabel),
        payment: { creditPreferred: false, requireCredit, providers: [] },
        openNow: false,
      });
      setPending({ intent, ...context });
      await runSearch(intent, context);
      return;
    }

    setLoading(true);
    try {
      const intentResponse = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: typed }),
      });
      if (!intentResponse.ok) throw new Error("تحلیل درخواست ناموفق بود.");
      const parsed = (await intentResponse.json()) as ParseResponse;
      const detected = parsed.detected;

      const resolvedCategory = manualCategory ?? detected?.category ?? category;
      const knownCategoryLabel = resolvedCategory
        ? categoryOptions.find((item) => item.id === resolvedCategory)?.label ??
          (resolvedCategory === "other" ? "محصول" : null)
        : null;
      const categoryLabel =
        resolvedCategory === detected?.category
          ? detected?.categoryLabel ?? knownCategoryLabel
          : knownCategoryLabel;

      if (detected?.category && !CATEGORIES.some((item) => item.id === detected.category)) {
        setExtraCategory({
          id: detected.category,
          label: categoryLabel ?? "محصول",
          icon: <Package size={15} />,
        });
      }

      const effectiveDetectedArea = manualArea ?? detected?.areaLabel ?? null;
      let resolvedArea = effectiveDetectedArea ?? areaLabel;
      if (effectiveDetectedArea) {
        if (!AREAS.includes(effectiveDetectedArea) && !extraAreas.includes(effectiveDetectedArea)) {
          setExtraAreas((prev) =>
            prev.includes(effectiveDetectedArea) ? prev : [...prev, effectiveDetectedArea],
          );
        }
        if (effectiveDetectedArea !== "نزدیک من") {
          setCoords(null);
          setCoordsSource(null);
        }
      }

      const missingProduct = !resolvedCategory;
      const missingArea = !resolvedArea;
      if (resolvedCategory) setCategory(resolvedCategory);
      if (resolvedArea) setAreaLabel(resolvedArea);
      if (missingProduct || missingArea) {
        setHint(requestMissingHint(missingProduct, missingArea));
        return;
      }

      if (resolvedArea === "نزدیک من" && !coords) {
        setHint("برای «نزدیک من» اجازه دسترسی به موقعیت یا انتخاب روی نقشه لازم است.");
        return;
      }

      const productBits = [
        categoryLabel,
        parsed.intent.brand?.trim(),
        parsed.intent.model?.trim(),
      ].filter((part): part is string => Boolean(part && part.length > 0));
      const productLabel = productBits.length > 0 ? productBits.join(" ") : "این محصول";

      const resolvedCategoryValue = resolvedCategory!;
      const resolvedAreaValue = resolvedArea!;
      const intent = withBudget({
        ...parsed.intent,
        category: resolvedCategoryValue,
        area: buildArea(resolvedAreaValue),
        payment: { ...parsed.intent.payment, requireCredit },
      });
      const context = { productLabel, areaLabel: resolvedAreaValue };
      setPending({ intent, ...context });

      const dynamicCategory = resolvedCategoryValue === "other";
      const dynamicArea = !AREAS.includes(resolvedAreaValue);
      const needsConfirmation =
        (dynamicCategory && manualCategory === null) || (dynamicArea && manualArea === null);
      if (needsConfirmation) {
        setStage("confirm");
        return;
      }

      await runSearch(intent, context);
    } catch (err) {
      setError(err instanceof Error ? err.message : "چیزی درست پیش نرفت. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(
    intent: Intent,
    context: { productLabel: string; areaLabel: string },
    productId?: string,
  ) {
    setLoading(true);
    setError(null);
    setFailure(null);
    try {
      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productId ? { intent, productId } : { intent }),
      });
      if (!searchResponse.ok) {
        const payload = (await searchResponse.json().catch(() => ({}))) as Partial<SearchFailure> & {
          error?: string;
        };
        if (searchResponse.status === 404 && payload.reason) {
          setStage("input");
          setPending(null);
          setHint(null);
          setFailure({
            reason: payload.reason,
            broaderArea: Boolean(payload.broaderArea),
            suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
            message: `${areaPhrase(context.areaLabel)} فروشگاهی برای «${context.productLabel}» پیدا نشد.`,
            intent,
            productLabel: context.productLabel,
            areaLabel: context.areaLabel,
            productId,
          });
          return;
        }
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

  function confirmSearch() {
    if (pending) {
      void runSearch(pending.intent, {
        productLabel: pending.productLabel,
        areaLabel: pending.areaLabel,
      });
    }
  }

  function rejectSearch() {
    setStage("input");
    setPending(null);
    setFailure(null);
    setCorrecting(true);
    setHint("محدوده یا محصول را اصلاح کن و دوباره بفرست.");
  }

  async function retryBroaderArea() {
    if (!failure) return;
    const widerIntent: Intent = {
      ...failure.intent,
      area: { label: "همه تهران", radiusKm: 30 },
    };
    const context = { productLabel: failure.productLabel, areaLabel: "همه تهران" };
    const productId = failure.productId;
    setAreaLabel("همه تهران");
    setCoords(null);
    setCoordsSource(null);
    setFailure(null);
    setHint(null);
    setPending({ intent: widerIntent, ...context });
    await runSearch(widerIntent, context, productId);
  }

  async function retrySuggestion(suggestion: SearchSuggestion) {
    if (!failure) return;
    const intent: Intent = {
      ...failure.intent,
      rawText: suggestion.title,
      model: suggestion.title,
    };
    const context = { productLabel: suggestion.title, areaLabel: failure.areaLabel };
    setText(suggestion.title);
    setFailure(null);
    setHint(null);
    setError(null);
    setCorrecting(false);
    setManualCategory(null);
    setManualArea(null);
    setPending({ intent, ...context });
    await runSearch(intent, context, suggestion.productId);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
      <section className="relative">
        <form
          onSubmit={prepareSearch}
          className="mt-6 rounded-lg border border-line bg-surface p-4 shadow-card sm:p-5"
        >
          {stage === "confirm" && pending ? (
            <div>
              <p className="text-sm font-bold leading-7">
                دنبال فروشنده {pending.productLabel} {areaPhrase(pending.areaLabel)} بگردم؟
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={confirmSearch}
                  disabled={loading}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 text-sm font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-accent-ink/35 border-t-accent-ink" />
                      در حال جست‌وجو…
                    </>
                  ) : (
                    <>
                      <Search size={17} />
                      بله
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={rejectSearch}
                  disabled={loading}
                  className="inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-md border border-line bg-surface px-4 text-sm font-bold text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  نه، اشتباهه
                </button>
              </div>
            </div>
          ) : (
            <>
              <label
                htmlFor="request"
                className={`text-sm font-bold ${hint ? "text-danger" : ""}`}
              >
                {hint ?? "همه فروشگاه‌های محل، کف دست شما!"}
              </label>
              <textarea
                id="request"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setHint(null);
                  setFailure(null);
                  setCorrecting(false);
                  setManualCategory(null);
                  setManualArea(null);
                }}
                rows={1}
                placeholder="مثلاً: گوشی سامسونگ S25 FE ۲۵۶ تا ۲۰۰ میلیون، فردوسی"
                className="mt-2 w-full resize-none rounded-md border border-line bg-bg px-3 py-2.5 text-[15px] leading-7 outline-none transition-colors placeholder:text-muted/80 focus:border-accent"
              />

              {failure ? (
                <div className="mt-3 rounded-md border border-danger/25 bg-danger-soft px-3 py-3" role="alert">
                  <p className="text-xs leading-6 text-danger">{failure.message}</p>
                  {failure.broaderArea ? (
                    <button
                      type="button"
                      onClick={() => void retryBroaderArea()}
                      disabled={loading}
                      className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-accent px-3 text-xs font-bold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Map size={14} />
                      جست‌وجو در همه تهران
                    </button>
                  ) : null}
                  {failure.suggestions.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[11px] leading-5 text-muted">شاید منظورت یکی از این‌ها باشد:</p>
                      <div className="mt-2 grid gap-1.5">
                        {failure.suggestions.map((suggestion) => (
                          <button
                            key={suggestion.productId}
                            type="button"
                            onClick={() => void retrySuggestion(suggestion)}
                            disabled={loading}
                            className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 text-start text-xs transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="min-w-0 truncate">{suggestion.title}</span>
                            {suggestion.minPrice != null ? (
                              <span className="shrink-0 text-[10px] text-muted">
                                {formatToman(suggestion.minPrice)}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {!failure.broaderArea && failure.suggestions.length === 0 ? (
                    <p className="mt-2 text-[11px] leading-5 text-muted">
                      محصول یا محدوده را دقیق‌تر مشخص کن و دوباره بفرست.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="mb-1.5 flex items-center gap-1 text-[11px] text-muted">
                    <MapPin size={13} />
                    محدوده
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {areaOptions.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => chooseArea(area)}
                        aria-pressed={areaLabel === area}
                        className={`min-h-9 max-w-full whitespace-nowrap rounded-full border px-3 text-xs transition-colors ${
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
                      نقطه‌ی انتخابی روی نقشه ثبت شد؛ جست‌وجو در شعاع ۵ کیلومترِ همان نقطه انجام
                      می‌شود.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="budget"
                    className="mb-1.5 flex items-center gap-1 text-[11px] text-muted"
                  >
                    <Wallet size={13} />
                    سقف بودجه (میلیون تومان)
                  </label>
                  <input
                    id="budget"
                    inputMode="numeric"
                    value={budgetMillion}
                    onChange={(event) => {
                      setBudgetMillion(event.target.value);
                      setFailure(null);
                    }}
                    placeholder="۲۰۰"
                    className="min-h-10 w-full rounded-md border border-line bg-bg px-3 text-sm outline-none transition-colors focus:border-accent sm:w-36"
                  />
                </div>
              </div>

              <div
                className="mt-5 flex flex-wrap gap-2"
                role="group"
                aria-label="دسته محصول"
              >
                {categoryOptions.map((option) => {
                  const selected = option.id === category;
                  return (
                    <button
                      key={`${option.id}-${option.label}`}
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
                  onChange={(event) => {
                    setRequireCredit(event.target.checked);
                    setFailure(null);
                  }}
                  className="size-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span>فقط خرید اعتباری</span>
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
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
            </>
          )}

          {error ? (
            <div className="mt-5 rounded-md bg-danger-soft px-3 py-2 text-xs leading-6 text-danger">
              {error}
            </div>
          ) : null}
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
