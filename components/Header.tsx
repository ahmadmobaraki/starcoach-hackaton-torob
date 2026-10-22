import Link from "next/link";
import { Navigation } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="هم‌قدم، صفحه اصلی">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-ink">
            <Navigation size={16} strokeWidth={2.2} />
          </span>
          <span className="text-base font-extrabold tracking-tight">هم‌قدم</span>
          <span className="hidden text-[11px] text-muted sm:inline">قبل از رفتن، مطمئن شو</span>
        </Link>
        <Link
          href="/data"
          className="rounded-full px-3 py-2 text-xs text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          درباره داده
        </Link>
      </div>
    </header>
  );
}
