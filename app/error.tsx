"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Header } from "@/components/Header";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className="rounded-lg border border-line bg-surface p-6 text-center">
          <TriangleAlert className="mx-auto text-warning" size={28} />
          <h1 className="mt-3 text-base font-bold">چیزی درست پیش نرفت</h1>
          <p className="mt-2 text-xs leading-6 text-muted">
            درخواست را دوباره امتحان کن. اگر تکرار شد، یک لحظه بعد برگرد.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-bold text-accent-ink"
            >
              <RotateCcw size={14} />
              دوباره
            </button>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center rounded-md border border-line px-3 text-xs text-muted"
            >
              صفحه اصلی
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
