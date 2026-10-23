"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  CreditCard,
  Info,
  List,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Price } from "@/components/Price";
import { StatusChip } from "@/components/StatusChip";
import {
  formatDistance,
  formatToman,
  relativeTimeFa,
  toFaDigits,
} from "@/lib/format";
import type { CategoryGroup, Intent, OfferWithShop, SearchResult } from "@/lib/types";

const MapPanel = dynamic(() => import("@/components/MapPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[320px] place-items-center rounded-md border border-line bg-surface text-xs text-muted">
      نقشه در حال بارگذاری…
    </div>
  ),
});

type Stored = { intent: Intent; result: SearchResult };
type SortMode = "best" | "cheap" | "near";

const CATEGORY_LABELS: Record<CategoryGroup, string> = {
  phone: "گوشی",
  watch: "ساعت",
  lighting: "روشنایی",
  home: "لوازم خانگی",
  tools: "ابزار و برق",
  other: "محصول",
};

const CATEGORY_EXAMPLES: Record<CategoryGroup, string> = {
  phone: "گوشی سامسونگ S25 FE ۲۵۶",
  watch: "ساعت کاسیو مردانه",
  lighting: "لوستر مدرن",
  home: "جارو برقی شارژری",
  tools: "کلید فیوز مینیاتوری",
  other: "محصول",
};

function hoursTone(offer: OfferWithShop) {
  if (offer.hours.state === "open") return "success" as const;
  if (offer.hours.state === "closed") return "warning" as const;
  return "neutral" as const;
}

function stockChip(offer: OfferWithShop) {
  if (offer.confirmation?.status === "confirmed") {
    return <StatusChip tone="success" icon={<BadgeCheck size={12} />}>موجودی تأیید شد</StatusChip>;
  }
  if (offer.confirmation?.status === "unavailable") {
    return <StatusChip tone="danger">تمام شد</StatusChip>;
  }
  if (offer.confirmation?.status === "pending") {
    return <StatusChip tone="warning">در انتظار پاسخ</StatusChip>;
  }
  if (offer.confirmation?.status === "ambiguous") {
    return <StatusChip tone="warning">پاسخ ناقص</StatusChip>;
  }
  return <StatusChip tone="neutral">موجودی نامشخص</StatusChip>;
}

export function ResultsClient() {
  const router = useRouter();
  const [state, setState] = useState<Stored | null>(null);
  const [loading, setLoading] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [sort, setSort] = useState<SortMode>("best");
  const [showCompare, setShowCompare] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<CategoryGroup>("phone");
  const [editArea, setEditArea] = useState("فردوسی و شیخ هادی");
  const [editBudget, setEditBudget] = useState("");
  const [editCredit, setEditCredit] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("hamqadam:last");
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as Stored;
      setState(stored);
      setEditCategory(stored.intent.category);
      setEditArea(stored.intent.area.label);
      setEditBudget(
        stored.intent.budgetMaxToman ? String(Math.round(stored.intent.budgetMaxToman / 1_000_000)) : "",
      );
      setEditCredit(stored.intent.payment.requireCredit);
    } catch {
      setError("اطلاعات این جست‌وجو خوانا نبود. از صفحه‌ی اول دوباره شروع کنید.");
    }
  }, []);

  async function runSearch(intent: Intent, categoryText?: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "نتیجه‌ای پیدا نشد.");
      }
      const result = (await response.json()) as SearchResult;
      const next = { intent, result };
      setState(next);
      sessionStorage.setItem("hamqadam:last", JSON.stringify(next));
      setEditCategory(intent.category);
      setEditArea(intent.area.label);
      setEditBudget(
        intent.budgetMaxToman ? String(Math.round(intent.budgetMaxToman / 1_000_000)) : "",
      );
      setEditCredit(intent.payment.requireCredit);
      if (categoryText) setShowEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "جست‌وجو ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  function toggleOpenNow() {
    if (!state) return;
    void runSearch({ ...state.intent, openNow: !state.intent.openNow });
  }

  function toggleCredit() {
    if (!state) return;
    void runSearch({
      ...state.intent,
      payment: { ...state.intent.payment, requireCredit: !state.intent.payment.requireCredit },
    });
  }

  async function switchCategory(category: CategoryGroup) {
    if (!state) return;
    const text = CATEGORY_EXAMPLES[category];
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("تغییر دسته ناموفق بود.");
      const parsed = (await response.json()) as { intent: Intent };
      const next: Intent = {
        ...parsed.intent,
        category,
        area: state.intent.area,
        payment: { ...parsed.intent.payment, requireCredit: state.intent.payment.requireCredit },
        budgetMaxToman: state.intent.budgetMaxToman,
      };
      await runSearch(next, text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تغییر دسته ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function applyEdit() {
    if (!state) return;
    const next: Intent = {
      ...state.intent,
      category: editCategory,
      area: {
        ...state.intent.area,
        label: editArea,
        radiusKm: editArea === "همه تهران" ? 30 : editArea === "نزدیک من" ? 5 : 4,
      },
      payment: { ...state.intent.payment, requireCredit: editCredit },
    };
    if (editBudget.trim()) {
      const value = Number(editBudget.replace(/[^\d]/g, ""));
      if (value > 0) next.budgetMaxToman = value * 1_000_000;
    } else {
      next.budgetMaxToman = undefined;
    }
    if (editCategory !== state.intent.category) {
      await switchCategory(editCategory);
      return;
    }
    await runSearch(next);
    setShowEdit(false);
  }

  async function startInquiry() {
    if (!state || inquiryLoading) return;
    setInquiryLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: state.intent,
          productId: state.result.product.productId,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "شروع استعلام ناموفق بود.");
      }
      const run = (await response.json()) as { runId: string };
      router.push(`/ask/${run.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "شروع استعلام ناموفق بود.");
    } finally {
      setInquiryLoading(false);
    }
  }

  const offers = useMemo(() => {
    if (!state) return [];
    const list = [...state.result.offers];
    if (sort === "cheap") {
      list.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
    } else if (sort === "near") {
      list.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    }
    return list;
  }, [state, sort]);

  const compareOffers = useMemo(() => {
    if (!state) return [];
    return [...state.result.offers]
      .filter((o) => o.price != null)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, 3);
  }, [state]);

  if (!state && !error) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 py-16">
          <div className="animate-pulse space-y-3">
            <div className="h-7 w-48 rounded bg-line/60" />
            <div className="h-24 rounded-lg bg-line/40" />
            <div className="h-40 rounded-lg bg-line/30" />
          </div>
        </main>
      </>
    );
  }

  if (!state) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 py-16">
          <div className="rounded-lg border border-line bg-surface p-6 text-center">
            <SearchX className="mx-auto text-muted" size={28} />
            <h1 className="mt-3 text-base font-bold">چیزی برای نمایش نیست</h1>
            <p className="mt-2 text-xs leading-6 text-muted">{error ?? "از صفحه‌ی اول یک درخواست بساز."}</p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-10 items-center gap-1 rounded-md bg-accent px-4 text-xs font-bold text-accent-ink"
            >
              <ArrowRight size={14} />
              شروع از اول
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { product, facets } = state.result;
  const best = offers[0];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-ink">
            <ArrowRight size={15} />
            درخواست جدید
          </Link>
          <button
            type="button"
            onClick={() => setShowEdit((v) => !v)}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-surface px-3 text-xs text-muted hover:text-ink"
          >
            <SlidersHorizontal size={13} />
            ویرایش درخواست
          </button>
        </div>

        <section className="mt-3 rounded-lg border border-line bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="info">{CATEGORY_LABELS[state.intent.category]}</StatusChip>
            <StatusChip tone="neutral" icon={<MapPin size={12} />}>{state.intent.area.label}</StatusChip>
            {state.intent.budgetMaxToman ? (
              <StatusChip tone="neutral" icon={<Wallet size={12} />}>
                تا {formatToman(state.intent.budgetMaxToman)}
              </StatusChip>
            ) : null}
            {state.intent.payment.requireCredit ? (
              <StatusChip tone="warning" icon={<CreditCard size={12} />}>فقط پرداخت اعتباری</StatusChip>
            ) : null}
            {state.intent.rawText ? (
              <span className="text-[11px] text-muted">«{state.intent.rawText.slice(0, 64)}{state.intent.rawText.length > 64 ? "…" : ""}»</span>
            ) : null}
          </div>

          {showEdit ? (
            <div className="mt-3 rounded-md border border-line bg-bg p-3">
              <div className="text-[11px] font-bold">دسته</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORY_LABELS) as CategoryGroup[])
                  .filter((c) => c !== "other")
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditCategory(c)}
                      className={`min-h-8 whitespace-nowrap rounded-full border px-2.5 text-[11px] ${
                        editCategory === c
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line bg-surface text-muted"
                      }`}
                    >
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-bold">محدوده</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["فردوسی و شیخ هادی", "همه تهران", "نزدیک من"].map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setEditArea(area)}
                        className={`min-h-8 whitespace-nowrap rounded-full border px-2.5 text-[11px] ${
                          editArea === area
                            ? "border-ink/20 bg-ink text-white"
                            : "border-line bg-surface text-muted"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-budget" className="text-[11px] font-bold">سقف بودجه (میلیون)</label>
                  <input
                    id="edit-budget"
                    inputMode="numeric"
                    value={editBudget}
                    onChange={(event) => setEditBudget(event.target.value)}
                    className="mt-1.5 min-h-9 w-full rounded-md border border-line bg-surface px-2.5 text-xs outline-none focus:border-accent"
                    placeholder="۲۰۰"
                  />
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                <input
                  type="checkbox"
                  checked={editCredit}
                  onChange={(event) => setEditCredit(event.target.checked)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                فقط فروشگاه‌های دارای پرداخت اعتباری
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={applyEdit}
                  disabled={loading}
                  className="min-h-9 rounded-md bg-accent px-3 text-xs font-bold text-accent-ink disabled:opacity-50"
                >
                  اعمال
                </button>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="min-h-9 rounded-md border border-line px-3 text-xs text-muted"
                >
                  بستن
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-4 flex gap-3 rounded-lg border border-line bg-surface p-3">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.title}
              className="size-20 shrink-0 rounded-md border border-line object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid size-20 shrink-0 place-items-center rounded-md bg-bg text-muted">
              <Store size={22} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="line-clamp-2 text-sm font-extrabold leading-6">{product.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span>{toFaDigits(offers.length)} فروشگاه در بودجه</span>
              <span className="text-line">·</span>
              <span>از {toFaDigits(product.offerCount)} قیمت ثبت‌شده</span>
              {product.brand ? (
                <>
                  <span className="text-line">·</span>
                  <span dir="ltr" className="font-medium">{product.brand}</span>
                </>
              ) : null}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <Price value={product.minPrice} className="text-base text-accent" />
              {product.minPrice != null && product.maxPrice != null && product.maxPrice !== product.minPrice ? (
                <span className="text-[11px] text-muted">
                  تا {formatToman(product.maxPrice)}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={toggleOpenNow}
                className={`min-h-8 whitespace-nowrap rounded-full border px-2.5 text-[11px] ${
                  state.intent.openNow
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line bg-surface text-muted"
                }`}
              >
                باز الان ({toFaDigits(facets.openNowCount)})
              </button>
              <button
                type="button"
                onClick={toggleCredit}
                className={`min-h-8 whitespace-nowrap rounded-full border px-2.5 text-[11px] ${
                  state.intent.payment.requireCredit
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line bg-surface text-muted"
                }`}
              >
                پرداخت اعتباری ({toFaDigits(facets.paymentCount)})
              </button>
              <button
                type="button"
                onClick={() => setShowCompare(true)}
                className="min-h-8 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 text-[11px] text-muted"
              >
                مقایسه‌ی ۳ فروشگاه
              </button>
            </div>
            <div className="flex shrink-0 rounded-full border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                aria-label="نمایش فهرست"
                className={`grid size-8 place-items-center rounded-full ${view === "list" ? "bg-ink text-white" : "text-muted"}`}
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                aria-label="نمایش نقشه"
                className={`grid size-8 place-items-center rounded-full ${view === "map" ? "bg-ink text-white" : "text-muted"}`}
              >
                <MapIcon size={14} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span>مرتب‌سازی:</span>
            {[
              { id: "best", label: "پیشنهاد هم‌قدم" },
              { id: "cheap", label: "ارزان‌ترین" },
              { id: "near", label: "نزدیک‌ترین" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSort(option.id as SortMode)}
                className={`rounded-full px-2 py-1 ${
                  sort === option.id ? "bg-accent-soft font-bold text-accent" : "hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {view === "map" ? (
          <section className="mt-3">
            <MapPanel
              offers={offers}
              onSelect={(shopId) => {
                setSelectedShopId(shopId);
                setView("list");
                setTimeout(() => {
                  document.getElementById(`shop-${shopId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 80);
              }}
            />
            <p className="mt-1 text-center text-[10px] text-muted">نقشه‌ی تقریبی؛ برای مسیر دقیق، گوگل مپ را باز کن.</p>
          </section>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs leading-6 text-danger">{error}</div>
        ) : null}

        {offers.length === 0 ? (
          <section className="mt-4 rounded-lg border border-line bg-surface p-6 text-center">
            <SearchX className="mx-auto text-muted" size={26} />
            <h2 className="mt-2 text-sm font-bold">با این فیلترها چیزی نماند</h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              فیلتر پرداخت اعتباری در این دیتاست پوشش کمی دارد. یکی از فیلترها را خاموش کن.
            </p>
            <button
              type="button"
              onClick={() => runSearch({ ...state.intent, openNow: false, payment: { ...state.intent.payment, requireCredit: false } })}
              className="mt-3 min-h-9 rounded-md bg-accent px-3 text-xs font-bold text-accent-ink"
            >
              خاموش کردن فیلترها
            </button>
          </section>
        ) : (
          <section className="mt-3 space-y-2">
            {offers.map((offer) => {
              const selected = selectedShopId === offer.shop.shopId;
              return (
                <article
                  key={offer.offerId}
                  id={`shop-${offer.shop.shopId}`}
                  className={`rounded-lg border bg-surface p-3.5 shadow-card transition-colors ${
                    selected ? "border-accent ring-1 ring-accent/25" : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="text-sm font-bold">{offer.shop.name}</h2>
                        {offer.shop.locationLabel ? (
                          <span className="text-[11px] text-muted">{offer.shop.locationLabel}</span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {stockChip(offer)}
                        <StatusChip tone={hoursTone(offer)} icon={<Clock size={12} />}>
                          {offer.hours.label}
                        </StatusChip>
                        {offer.warrantyMonths != null ? (
                          <StatusChip tone="info" icon={<ShieldCheck size={12} />}>
                            گارانتی {toFaDigits(offer.warrantyMonths)} ماه
                          </StatusChip>
                        ) : offer.warrantyLabel ? (
                          <StatusChip tone="info" icon={<ShieldCheck size={12} />}>{offer.warrantyLabel}</StatusChip>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-end">
                      <Price value={offer.price} className="block text-base text-ink" />
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {offer.lastPriceChangedAt ? `قیمت ثبت‌شده ${relativeTimeFa(offer.lastPriceChangedAt)}` : "زمان قیمت نامشخص"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {formatDistance(offer.distanceKm)} از مرکز محدوده
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard size={11} />
                      {offer.hasCredit
                        ? offer.shop.payments.map((p) => p.providerName).join("، ")
                        : "پرداخت اعتباری نامشخص"}
                    </span>
                    {offer.shop.fastDelivery ? <span>ارسال فوری</span> : null}
                    {offer.shop.websiteUrl ? (
                      <a
                        href={offer.shop.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-info underline-offset-2 hover:underline"
                      >
                        وب‌سایت فروشگاه
                      </a>
                    ) : null}
                    {offer.shop.instagram ? (
                      <a
                        href={
                          offer.shop.instagram.startsWith("http")
                            ? offer.shop.instagram
                            : `https://instagram.com/${offer.shop.instagram.replace(/^@/, "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-info underline-offset-2 hover:underline"
                      >
                        اینستاگرام
                      </a>
                    ) : null}
                  </div>

                  {offer.reasons.length ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2 text-[10px] text-muted">
                      {offer.reasons.map((reason) => (
                        <span key={reason} className="flex items-center gap-1">
                          <Check size={11} className="text-accent" />
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {offer.confirmation?.confirmedAt ? (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-accent">
                      <BadgeCheck size={12} />
                      تأیید فروشنده: {relativeTimeFa(offer.confirmation.confirmedAt)}
                      {offer.confirmation.confirmedHours ? ` · تا ${toFaDigits(offer.confirmation.confirmedHours)}` : ""}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}

        <section className="mt-5 rounded-lg border border-dashed border-accent/35 bg-accent-soft px-4 py-3">
          <div className="flex items-start gap-2 text-[11px] leading-6 text-accent">
            <Info size={15} className="mt-1 shrink-0" />
            <p>
              این قیمت‌ها «ثبت‌شده» هستند، نه موجودی زنده. با استعلام، دستیار از فروشگاه‌های نزدیک
              می‌پرسد و جواب را روی همین کارت‌ها می‌نشاند.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-muted">بهترین گزینه‌ی فعلی</div>
            <div className="truncate text-xs font-bold">
              {best ? `${best.shop.name} · ${formatToman(best.price)}` : "فروشگاهی پیدا نشد"}
            </div>
          </div>
          <button
            type="button"
            onClick={startInquiry}
            disabled={inquiryLoading || offers.length === 0}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 text-xs font-bold text-accent-ink disabled:opacity-50"
          >
            {inquiryLoading ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-accent-ink/35 border-t-accent-ink" />
                در حال پرسیدن…
              </>
            ) : (
              <>
                <MessageCircle size={15} />
                از ۳ فروشگاه بپرس
              </>
            )}
          </button>
        </div>
      </div>

      {showCompare ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="مقایسه فروشگاه‌ها"
          onClick={() => setShowCompare(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-2xl overflow-auto rounded-t-lg bg-surface p-4 sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">مقایسه‌ی سه فروشگاه ارزان‌تر</h2>
              <button
                type="button"
                onClick={() => setShowCompare(false)}
                aria-label="بستن"
                className="grid size-9 place-items-center rounded-full border border-line text-muted"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-start text-[11px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 font-medium">فروشگاه</th>
                    <th className="py-2 font-medium">قیمت</th>
                    <th className="py-2 font-medium">گارانتی</th>
                    <th className="py-2 font-medium">فاصله</th>
                    <th className="py-2 font-medium">ساعت</th>
                    <th className="py-2 font-medium">پرداخت</th>
                  </tr>
                </thead>
                <tbody>
                  {compareOffers.map((offer) => (
                    <tr key={offer.offerId} className="border-b border-line/70">
                      <td className="py-2.5 font-bold">{offer.shop.name}</td>
                      <td className="py-2.5">{formatToman(offer.price)}</td>
                      <td className="py-2.5">
                        {offer.warrantyMonths != null ? `${toFaDigits(offer.warrantyMonths)} ماه` : "نامشخص"}
                      </td>
                      <td className="py-2.5">{formatDistance(offer.distanceKm)}</td>
                      <td className="py-2.5">{offer.hours.label}</td>
                      <td className="py-2.5">
                        {offer.hasCredit ? offer.shop.payments.map((p) => p.providerName).join("، ") : "نامشخص"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[10px] leading-6 text-muted">
              قیمت‌ها ثبت‌شده‌اند. ستون «پرداخت» فقط گزینه‌های اعلام‌شده را نشان می‌دهد؛ خالی یعنی
              اطلاعاتی ثبت نشده، نه اینکه فروشگاه پرداخت اعتباری ندارد.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
