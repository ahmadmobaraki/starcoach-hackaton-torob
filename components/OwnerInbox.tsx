"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, MessageCircle, RefreshCw, Send, Store, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { StatusChip } from "@/components/StatusChip";
import { DEMO_SHOPS } from "@/lib/demo";
import { formatToman, relativeTimeFa, toFaDigits } from "@/lib/format";
import type { OwnerReply, Thread } from "@/lib/types";

function threadTitle(thread: Thread) {
  return thread.offer.sellerTitle ?? "درخواست خرید";
}

export function OwnerInbox({
  shopId,
  shopName,
  shopAddress,
  initialThreads,
}: {
  shopId: string;
  shopName: string;
  shopAddress: string;
  initialThreads: Thread[];
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreads[0]?.threadId ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastParsed, setLastParsed] = useState<OwnerReply | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => threads.find((thread) => thread.threadId === selectedId) ?? threads[0] ?? null,
    [threads, selectedId],
  );

  const quickReplies = useMemo(() => {
    const demo = DEMO_SHOPS.find((shop) => shop.shopId === shopId);
    return demo
      ? [demo.expectedReply, "موجوده، قیمت امروز همونه. تا ۹ شب بازیم.", "تمام شده."]
      : ["موجوده.", "تمام شده.", "قیمت امروز عوض شده."];
  }, [shopId]);

  async function refresh() {
    try {
      const response = await fetch(`/api/owner/threads?shopId=${encodeURIComponent(shopId)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { threads: Thread[] };
      setThreads(payload.threads);
      if (!payload.threads.some((thread) => thread.threadId === selectedId)) {
        setSelectedId(payload.threads[0]?.threadId ?? null);
      }
    } catch {
      // Keep the last good state.
    }
  }

  useEffect(() => {
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, selectedId]);

  async function sendReply() {
    if (!selected || !text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/owner/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selected.threadId, text }),
      });
      if (!response.ok) throw new Error("ثبت پاسخ ناموفق بود.");
      const payload = (await response.json()) as { parsed: OwnerReply };
      setLastParsed(payload.parsed);
      setText("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت پاسخ ناموفق بود.");
    } finally {
      setSending(false);
    }
  }

  async function resetDemo() {
    await fetch("/api/demo/reset", { method: "POST" });
    setThreads([]);
    setSelectedId(null);
    setLastParsed(null);
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/store" className="inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-ink">
            <ArrowRight size={15} />
            فروشگاه‌ها
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[10px] font-bold text-warning">دمو</span>
            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[10px] text-muted hover:text-danger"
            >
              <Trash2 size={12} />
              بازنشانی
            </button>
          </div>
        </div>

        <section className="mt-3 rounded-lg border border-line bg-surface p-4 shadow-card">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Store size={19} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold">{shopName}</h1>
              <p className="mt-0.5 text-[11px] leading-6 text-muted">{shopAddress}</p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold">گفت‌وگوها</h2>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[10px] text-muted"
            >
              <RefreshCw size={12} />
              به‌روزرسانی
            </button>
          </div>
          {threads.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-line bg-surface p-6 text-center">
              <MessageCircle className="mx-auto text-muted" size={24} />
              <p className="mt-2 text-xs font-bold">هنوز استعلامی نیامده</p>
              <p className="mt-1 text-[11px] leading-6 text-muted">
                از اپ خریدار یک درخواست بساز و «از ۳ فروشگاه بپرس» را بزن.
              </p>
              <Link
                href="/"
                className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-md bg-accent px-3 text-xs font-bold text-accent-ink"
              >
                باز کردن اپ خریدار
              </Link>
            </div>
          ) : (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {threads.map((thread) => {
                const active = thread.threadId === selected?.threadId;
                const last = thread.messages.at(-1);
                return (
                  <button
                    key={thread.threadId}
                    type="button"
                    onClick={() => {
                      setSelectedId(thread.threadId);
                      setLastParsed(null);
                    }}
                    className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-[10px] ${
                      active
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line bg-surface text-muted"
                    }`}
                  >
                    {threadTitle(thread).slice(0, 26)}
                    {last?.role === "buyer" ? " · جدید" : ""}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selected ? (
          <section className="mt-3 rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs font-bold">{threadTitle(selected)}</h2>
                {selected.confirmation.status === "confirmed" ? (
                  <StatusChip tone="success">تأیید شد</StatusChip>
                ) : selected.confirmation.status === "unavailable" ? (
                  <StatusChip tone="danger">ناموجود</StatusChip>
                ) : (
                  <StatusChip tone="warning">در انتظار پاسخ</StatusChip>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted">
                <span>{formatToman(selected.offer.price)}</span>
                <span className="text-line">·</span>
                <span>{selected.offer.hours.label}</span>
                <span className="text-line">·</span>
                <span>{toFaDigits(selected.messages.length)} پیام</span>
              </div>
            </div>

            <div className="space-y-2 px-4 py-3">
              {selected.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "buyer" ? "justify-start" : message.role === "owner" ? "justify-end" : "justify-center"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-lg px-3 py-2 text-[11px] leading-6 ${
                      message.role === "buyer"
                        ? "bg-bg text-ink ring-1 ring-line"
                        : message.role === "owner"
                          ? "bg-accent text-accent-ink"
                          : "bg-warning-soft text-warning"
                    }`}
                  >
                    {message.role === "buyer" ? <span className="ms-1 font-bold">خریدار: </span> : null}
                    {message.role === "agent" ? <span className="ms-1 font-bold">دستیار: </span> : null}
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            {lastParsed ? (
              <div className="mx-4 mb-3 rounded-md bg-accent-soft px-3 py-2 text-[10px] leading-6 text-accent">
                <span className="font-bold">دستیار خواند: </span>
                {lastParsed.available === true ? "موجود" : lastParsed.available === false ? "ناموجود" : "نامشخص"}
                {lastParsed.priceToman ? ` · ${formatToman(lastParsed.priceToman)}` : ""}
                {lastParsed.closesAt ? ` · تا ${toFaDigits(lastParsed.closesAt)}` : ""}
                {lastParsed.warrantyMonths ? ` · گارانتی ${toFaDigits(lastParsed.warrantyMonths)} ماه` : ""}
              </div>
            ) : null}

            <div className="border-t border-line p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setText(reply)}
                    className="rounded-full border border-line bg-bg px-2.5 py-1 text-[10px] text-muted hover:border-accent/40 hover:text-ink"
                  >
                    {reply}
                  </button>
                ))}
              </div>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={2}
                placeholder="پاسخ فروشنده را بنویس…"
                className="w-full resize-none rounded-md border border-line bg-bg px-3 py-2 text-[12px] leading-6 outline-none focus:border-accent"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted">
                  {selected.messages.at(-1) ? `آخرین پیام ${relativeTimeFa(selected.messages.at(-1)!.createdAt)}` : ""}
                </span>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={sending || !text.trim()}
                  className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-3 text-xs font-bold text-accent-ink disabled:opacity-50"
                >
                  <Send size={13} />
                  {sending ? "در حال ارسال…" : "ارسال پاسخ"}
                </button>
              </div>
              {error ? <div className="mt-2 text-[10px] text-danger">{error}</div> : null}
            </div>
          </section>
        ) : null}

        <section className="mt-4 flex items-start gap-2 rounded-md bg-surface px-3 py-2 text-[10px] leading-6 text-muted ring-1 ring-line">
          <Check size={13} className="mt-1 shrink-0 text-accent" />
          <p>
            پاسخ شما با متن آزاد به خریدار می‌رسد. دستیار موجودی، قیمت، ساعت و گارانتی را از همان
            متن درمی‌آورد. این پنل نمایشی است؛ در نسخه‌ی واقعی به واتساپ بیزینس وصل می‌شود.
          </p>
        </section>
      </main>
    </>
  );
}
