"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function ShareButton({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-3 text-xs text-ink transition-colors hover:border-accent/40"
      >
        {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
        {copied ? "کپی شد" : "کپی برنامه"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-3 text-xs text-ink transition-colors hover:border-accent/40"
      >
        <Share2 size={14} />
        فرستادن در واتساپ
      </a>
    </div>
  );
}
