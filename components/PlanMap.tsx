"use client";

import dynamic from "next/dynamic";
import type { OfferWithShop } from "@/lib/types";

const MapPanel = dynamic(() => import("@/components/MapPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[280px] place-items-center rounded-md border border-line bg-surface text-xs text-muted">
      نقشه در حال بارگذاری…
    </div>
  ),
});

export function PlanMap({ offers }: { offers: OfferWithShop[] }) {
  return <MapPanel offers={offers} />;
}
