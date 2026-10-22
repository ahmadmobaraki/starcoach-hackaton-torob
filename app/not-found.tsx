import Link from "next/link";
import { SearchX } from "lucide-react";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className="rounded-lg border border-line bg-surface p-6 text-center">
          <SearchX className="mx-auto text-muted" size={28} />
          <h1 className="mt-3 text-base font-bold">این صفحه پیدا نشد</h1>
          <p className="mt-2 text-xs leading-6 text-muted">
            ممکن است لینک قدیمی باشد یا درخواست پاک شده باشد.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-10 items-center rounded-md bg-accent px-3 text-xs font-bold text-accent-ink"
          >
            شروع از صفحه اصلی
          </Link>
        </div>
      </main>
    </>
  );
}
