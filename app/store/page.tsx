import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageCircle, Store } from "lucide-react";
import { Header } from "@/components/Header";
import { getStoreList, getStoreThreads } from "@/lib/agent";
import { toFaDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function StorePage() {
  const shops = getStoreList();
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <Link href="/" className="inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-ink">
          <ArrowRight size={15} />
          اپ خریدار
        </Link>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">پنل فروشنده</h1>
            <p className="mt-1 max-w-lg text-xs leading-6 text-muted">
              نسخه‌ی نمایشی برای نشان دادن حلقه‌ی استعلام. پاسخ را با متن آزاد بنویس؛ دستیار آن را
              می‌خواند و وضعیت خریدار را عوض می‌کند.
            </p>
          </div>
          <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[10px] font-bold text-warning">
            دمو
          </span>
        </div>

        <section className="mt-5 space-y-2">
          {shops.map((shop) => {
            const threads = getStoreThreads(shop.shop_id);
            const pending = threads.filter(
              (thread) => thread.messages.at(-1)?.role === "buyer",
            ).length;
            return (
              <Link
                key={shop.shop_id}
                href={`/store/${shop.shop_id}`}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3.5 transition-colors hover:border-accent/40"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-accent">
                  <Store size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">{shop.name}</span>
                    {pending > 0 ? (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-ink">
                        {toFaDigits(pending)} پیام
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted">
                    {shop.location_label ?? "محدوده نامشخص"} · {shop.address ?? "آدرس ثبت نشده"}
                  </div>
                </div>
                <MessageCircle size={15} className="text-muted" />
                <ArrowLeft size={14} className="text-muted" />
              </Link>
            );
          })}
        </section>

        <p className="mt-5 text-[10px] leading-6 text-muted">
          در نسخه‌ی واقعی، هر فروشنده با ورود به حساب خودش فقط گفت‌وگوهای همان فروشگاه را می‌بیند.
          این صفحه برای دمو بدون ورود باز است.
        </p>
      </main>
    </>
  );
}
