"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  RefreshCw,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Price } from "@/components/Price";
import { StatusChip } from "@/components/StatusChip";
import { formatToman, relativeTimeFa, toFaDigits } from "@/lib/format";
import type { OfferWithShop, RunState, Thread } from "@/lib/types";

function statusLabel(status: RunState["status"]) {
  switch (status) {
    case "confirmed":
      return "موجودی تأیید شد";
    case "unavailable":
      return "در هیچ فروشگاهی تأیید نشد";
    case "partial":
      return "پاسخ‌ها در حال رسیدن است";
    default:
      return "در انتظار پاسخ فروشگاه‌ها";
  }
}

function threadStatus(thread: Thread) {
  switch (thread.confirmation.status) {
    case "confirmed":
      return <StatusChip tone="success" icon={<BadgeCheck size={12} />}>تأیید شد</StatusChip>;
    case "unavailable":
      return <StatusChip tone="danger">موجود نیست</StatusChip>;
    case "ambiguous":
      return <StatusChip tone="warning">پاسخ ناقص</StatusChip>;
    default:
      return <StatusChip tone="neutral" icon={<Clock size={12} />}>در انتظار پاسخ</StatusChip>;
  }
}

function MessageBubble({ role, text }: { role: string; text: string }) {
  const owner = role === "owner";
  const agent = role === "agent";
  return (
    <div className={`flex ${owner ? "justify-start" : agent ? "justify-center" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-[11px] leading-6 ${
          owner
            ? "bg-bg text-ink ring-1 ring-line"
            : agent
              ? "bg-warning-soft text-warning"
              : "bg-accent text-accent-ink"
        }`}
      >
        {agent ? <span className="ms-1 font-bold">دستیار: </span> : null}
        {text}
      </div>
    </div>
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
  const parsed = thread.messages.find((m) => m.role === "owner")?.parsed;
  return (
    <article className="rounded-lg border border-line bg-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold">{thread.shop.name}</h3>
            {threadStatus(thread)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {thread.shop.locationLabel ?? "محدوده نامشخص"}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {thread.offer.hours.label}
            </span>
          </div>
        </div>
        <div className="text-end">
          <Price value={thread.confirmation.confirmedPrice ?? thread.offer.price} className="text-sm" />
          {thread.confirmation.confirmedAt ? (
            <div className="mt-0.5 text-[10px] text-accent">
              تأیید {relativeTimeFa(thread.confirmation.confirmedAt)}
            </div>
          ) : (
            <div className="mt-0.5 text-[10px] text-muted">قیمت ثبت‌شده</div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {thread.messages.map((message) => (
          <MessageBubble key={message.id} role={message.role} text={message.text} />
        ))}
      </div>

      {parsed ? (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
          {parsed.available === true ? <StatusChip tone="success">موجود</StatusChip> : null}
          {parsed.available === false ? <StatusChip tone="danger">ناموجود</StatusChip> : null}
          {parsed.priceToman ? <StatusChip tone="info">{formatToman(parsed.priceToman)}</StatusChip> : null}
          {parsed.closesAt ? <StatusChip tone="neutral">تا {toFaDigits(parsed.closesAt)}</StatusChip> : null}
          {parsed.warrantyMonths ? (
            <StatusChip tone="neutral">گارانتی {toFaDigits(parsed.warrantyMonths)} ماه</StatusChip>
          ) : null}
          {parsed.alternativeStorageGb ? (
            <StatusChip tone="warning">جایگزین {toFaDigits(parsed.alternativeStorageGb)} گیگ</StatusChip>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function AlternativeCard({ offer }: { offer: OfferWithShop }) {
  return (
    <article className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold">{offer.shop.name}</div>
          <div className="mt-1 text-[10px] text-muted">
            {offer.shop.locationLabel ?? "محدوده نامشخص"} · {offer.hours.label}
          </div>
          {offer.reasons[0] ? (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-accent">
              <Check size={11} />
              {offer.reasons[0]}
            </div>
          ) : null}
        </div>
        <Price value={offer.price} className="text-sm" />
      </div>
    </article>
  );
}

export function AskClient({ initialRun }: { initialRun: RunState }) {
  const [run, setRun] = useState(initialRun);
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/confirmations?runId=${encodeURIComponent(run.runId)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const next = (await response.json()) as RunState;
        setRun(next);
      } catch {
        // Polling is best-effort; the page keeps the last good state.
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [run.runId, live]);

  const confirmed = useMemo(
    () => run.threads.filter((t) => t.confirmation.status === "confirmed"),
    [run],
  );
  const primary = confirmed[0];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/results" className="inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-ink">
            <ArrowRight size={15} />
            نتایج
          </Link>
          <div className="flex items-center gap-2 text-[10px] text-muted">
            <span className={`size-2 rounded-full ${live ? "bg-accent" : "bg-line"}`} />
            {live ? "به‌روزرسانی زنده" : "متوقف"}
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              className="grid size-8 place-items-center rounded-full border border-line"
              aria-label={live ? "توقف به‌روزرسانی" : "شروع به‌روزرسانی"}
            >
              <RefreshCw size={13} className={live ? "animate-spin [animation-duration:3s]" : ""} />
            </button>
          </div>
        </div>

        <section className="mt-3 rounded-lg border border-line bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-muted">دستیار خرید</div>
              <h1 className="mt-0.5 line-clamp-2 text-sm font-extrabold leading-6">{run.product.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusChip tone={run.status === "confirmed" ? "success" : run.status === "unavailable" ? "danger" : "warning"}>
                  {statusLabel(run.status)}
                </StatusChip>
                <StatusChip tone="neutral">{toFaDigits(run.threads.length)} فروشگاه</StatusChip>
              </div>
            </div>
            <div className="shrink-0 text-end">
              <Price value={primary?.confirmation.confirmedPrice ?? run.product.minPrice} className="text-base text-accent" />
              <div className="mt-0.5 text-[10px] text-muted">{primary ? primary.shop.name : "بهترین قیمت ثبت‌شده"}</div>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <h2 className="text-xs font-bold">دستیار چه کرد؟</h2>
          <ol className="mt-2 space-y-0">
            {run.events.map((event, index) => (
              <li key={event.id} className="relative flex gap-3 pb-3">
                {index < run.events.length - 1 ? (
                  <span className="absolute right-[11px] top-6 h-full w-px bg-line" aria-hidden />
                ) : null}
                <span className="relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/20">
                  {event.kind === "confirmed" ? <BadgeCheck size={13} /> : event.kind === "unavailable" ? <X size={13} /> : <Navigation size={12} />}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold leading-6">{event.title}</div>
                  {event.detail ? <div className="text-[10px] leading-5 text-muted">{event.detail}</div> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold">گفت‌وگو با فروشگاه‌ها</h2>
            <Link href="/store" className="text-[10px] text-info underline-offset-2 hover:underline">
              پنل فروشنده (دمو)
            </Link>
          </div>
          {run.threads.map((thread) => (
            <ThreadCard key={thread.threadId} thread={thread} />
          ))}
        </section>

        {run.alternatives.length ? (
          <section className="mt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold">جایگزین‌ها</h2>
              <span className="text-[10px] text-muted">وقتی موجودی تأیید نشد</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {run.alternatives.slice(0, 4).map((offer) => (
                <AlternativeCard key={offer.offerId} offer={offer} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-md bg-surface px-4 py-3 text-[10px] leading-6 text-muted ring-1 ring-line">
          <div className="flex items-start gap-2">
            <MessageCircle size={14} className="mt-1 shrink-0 text-accent" />
            <p>
              پاسخ‌ها از پنل نمایشی فروشنده می‌آیند؛ متن آزاد است و دستیار آن را می‌خواند. تا وقتی
              فروشنده موجودی را تأیید نکند، هیچ کارتی «موجود» نمی‌شود.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-muted">قدم بعدی</div>
            <div className="truncate text-xs font-bold">
              {primary ? `${primary.shop.name} · تا ${primary.offer.hours.today?.close ?? "ساعت نامشخص"}` : "جایگزین‌ها را ببین"}
            </div>
          </div>
          <Link
            href={`/plan/${run.runId}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 text-xs font-bold text-accent-ink"
          >
            <Navigation size={15} />
            برنامه سفر
          </Link>
        </div>
      </div>
    </>
  );
}
