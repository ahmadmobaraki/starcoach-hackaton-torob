import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Header } from "@/components/Header";
import { PlanMap } from "@/components/PlanMap";
import { Price } from "@/components/Price";
import { ShareButton } from "@/components/ShareButton";
import { StatusChip } from "@/components/StatusChip";
import { buildVisitPlan } from "@/lib/agent";
import { formatDistance, formatToman, relativeTimeFa, toFaDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

function mapsLink(lat: number | null, lon: number | null) {
  if (lat == null || lon == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

export default async function PlanPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const plan = buildVisitPlan(runId);
  if (!plan) notFound();

  const primary = plan.primary;
  const primaryConfirmed = primary?.confirmation?.status === "confirmed";
  const fallback = plan.fallback;
  const mapOffers = [primary, fallback, ...plan.alternatives].filter(
    (offer): offer is NonNullable<typeof offer> => Boolean(offer),
  );

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5">
        <Link href={`/ask/${runId}`} className="inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-ink">
          <ArrowRight size={15} />
          گفت‌وگو با فروشگاه‌ها
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] text-muted">برنامه‌ی سفر خرید</div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              {primaryConfirmed ? "برو، مطمئن." : "برنامه‌ی پیشنهادی"}
            </h1>
            <p className="mt-1 text-xs leading-6 text-muted">{plan.product.title}</p>
          </div>
          <ShareButton message={plan.message} />
        </div>

        {primary ? (
          <section className="mt-4 overflow-hidden rounded-lg border border-accent/25 bg-surface shadow-card">
            <div className={`px-4 py-3 text-white ${primaryConfirmed ? "bg-accent" : "bg-warning"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  {primaryConfirmed ? <BadgeCheck size={14} /> : <Clock size={14} />}
                  {primaryConfirmed ? "فروشگاه اصلی · موجودی تأییدشده" : "فروشگاه پیشنهادی · موجودی تأیید نشده"}
                </div>
                <span className="text-[10px] opacity-90">
                  {primary.confirmation?.confirmedAt
                    ? `تأیید ${relativeTimeFa(primary.confirmation.confirmedAt)}`
                    : "در انتظار تأیید"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-extrabold">{primary.shop.name}</h2>
                <div className="text-end">
                  <Price value={primary.confirmation?.confirmedPrice ?? primary.price} className="text-base" />
                  <div className="text-[9px] opacity-85">{primaryConfirmed ? "قیمت تأییدشده" : "قیمت ثبت‌شده"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2 text-xs leading-6 text-muted">
                <MapPin size={16} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <div className="font-medium text-ink">{primary.shop.address}</div>
                  <div className="mt-0.5 text-[11px]">
                    {primary.shop.locationLabel ?? "محدوده نامشخص"} · {formatDistance(primary.distanceKm)} از مرکز محدوده
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md bg-bg px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <Clock size={11} />
                    ساعت امروز
                  </div>
                  <div className="mt-0.5 text-xs font-bold">{primary.hours.label}</div>
                </div>
                <div className="rounded-md bg-bg px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <ShieldCheck size={11} />
                    گارانتی
                  </div>
                  <div className="mt-0.5 text-xs font-bold">
                    {primary.warrantyMonths != null ? `${toFaDigits(primary.warrantyMonths)} ماه` : primary.warrantyLabel ?? "نامشخص"}
                  </div>
                </div>
                <div className="rounded-md bg-bg px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <Store size={11} />
                    پرداخت
                  </div>
                  <div className="mt-0.5 text-xs font-bold">
                    {primary.hasCredit ? primary.shop.payments.map((p) => p.providerName).join("، ") : "نامشخص"}
                  </div>
                </div>
                <div className="rounded-md bg-bg px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <Navigation size={11} />
                    فاصله
                  </div>
                  <div className="mt-0.5 text-xs font-bold">{formatDistance(primary.distanceKm)}</div>
                </div>
              </div>

              {plan.mustLeaveBy ? (
                <div className="rounded-md bg-warning-soft px-3 py-2 text-[11px] leading-6 text-warning">
                  {primaryConfirmed
                    ? `قبل از ${toFaDigits(plan.mustLeaveBy)} برس؛ فروشگاه تا این ساعت باز است.`
                    : `ساعت اعلام‌شده تا ${toFaDigits(plan.mustLeaveBy)} است؛ اول موجودی را تأیید کن.`}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {mapsLink(primary.shop.lat, primary.shop.lon) ? (
                  <a
                    href={mapsLink(primary.shop.lat, primary.shop.lon)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-3 text-xs font-bold text-accent-ink"
                  >
                    <Route size={14} />
                    مسیر در گوگل مپ
                    <ExternalLink size={11} />
                  </a>
                ) : null}
                {primary.shop.websiteUrl ? (
                  <a
                    href={primary.shop.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-3 text-xs"
                  >
                    وب‌سایت فروشگاه
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-4 rounded-lg border border-line bg-surface p-6 text-center">
            <Store className="mx-auto text-muted" size={26} />
            <h2 className="mt-2 text-sm font-bold">هنوز فروشگاهی موجودی را تأیید نکرده</h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              جایگزین‌ها را ببین یا از فروشگاه دیگری بپرس.
            </p>
          </section>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-line bg-surface p-4">
            <h2 className="flex items-center gap-1.5 text-xs font-bold">
              <Check size={15} className="text-accent" />
              چک‌لیست قبل از پرداخت
            </h2>
            <ul className="mt-2 space-y-1.5">
              {plan.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[11px] leading-6 text-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4">
            <h2 className="flex items-center gap-1.5 text-xs font-bold">
              <Navigation size={15} className="text-accent" />
              اگر موجود نبود
            </h2>
            {fallback ? (
              <div className="mt-2">
                <div className="text-xs font-bold">{fallback.shop.name}</div>
                <div className="mt-1 text-[11px] leading-6 text-muted">{fallback.shop.address}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusChip tone="neutral">{fallback.hours.label}</StatusChip>
                  <StatusChip tone="info">{formatToman(fallback.price)}</StatusChip>
                  <StatusChip tone="neutral">{formatDistance(fallback.distanceKm)}</StatusChip>
                </div>
                {mapsLink(fallback.shop.lat, fallback.shop.lon) ? (
                  <a
                    href={mapsLink(fallback.shop.lat, fallback.shop.lon)!}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-9 items-center gap-1 text-[11px] text-info"
                  >
                    مسیر جایگزین
                    <ExternalLink size={11} />
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-6 text-muted">جایگزین نزدیکی ثبت نشده است.</p>
            )}
          </div>
        </section>

        {plan.alternatives.length ? (
          <section className="mt-5">
            <h2 className="text-xs font-bold">گزینه‌های دیگر</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {plan.alternatives.slice(0, 4).map((offer) => (
                <article key={offer.offerId} className="rounded-lg border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold">{offer.shop.name}</div>
                      <div className="mt-1 text-[10px] text-muted">
                        {offer.shop.locationLabel ?? "محدوده نامشخص"} · {offer.hours.label}
                      </div>
                    </div>
                    <Price value={offer.price} className="text-xs" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {mapOffers.length ? (
          <section className="mt-5">
            <h2 className="text-xs font-bold">نقشه</h2>
            <div className="mt-2">
              <PlanMap offers={mapOffers} />
            </div>
            <p className="mt-1 text-center text-[10px] text-muted">فاصله‌ها تقریبی‌اند؛ مسیر دقیق را در گوگل مپ ببین.</p>
          </section>
        ) : null}

        <section className="mt-5 rounded-md bg-surface px-4 py-3 text-[10px] leading-6 text-muted ring-1 ring-line">
          قیمت تأییدشده با قیمت ثبت‌شده یکی نیست. اگر فروشنده قیمت را عوض کند، هر دو با زمان نمایش
          داده می‌شوند. شماره‌ی تماس نمایشی را دکمه‌ی تماس نمی‌کنیم.
        </section>
      </main>
    </>
  );
}
