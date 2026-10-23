"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X } from "lucide-react";
import { toFaDigits } from "@/lib/format";

const DEFAULT_CENTER: [number, number] = [35.6977, 51.4098];

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%);filter:drop-shadow(0 6px 16px rgba(155,28,28,.3));">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="#9b1c1c" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="10" r="2.6" fill="#ffffff"/>
    </svg>
  </div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

export default function LocationPicker({
  initialLat = null,
  initialLon = null,
  onClose,
  onConfirm,
}: {
  initialLat?: number | null;
  initialLon?: number | null;
  onClose: () => void;
  onConfirm: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(
    initialLat != null && initialLon != null ? { lat: initialLat, lon: initialLon } : null,
  );

  function placeMarker(lat: number, lon: number) {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lon], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on("drag", (event) => {
        const point = (event.target as L.Marker).getLatLng();
        setPicked({ lat: point.lat, lon: point.lng });
      });
    } else {
      markerRef.current.setLatLng([lat, lon]);
    }
    if (!circleRef.current) {
      circleRef.current = L.circle([lat, lon], {
        radius: 5000,
        color: "#9b1c1c",
        weight: 1,
        opacity: 0.3,
        fillColor: "#9b1c1c",
        fillOpacity: 0.06,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng([lat, lon]);
    }
    setPicked({ lat, lon });
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const hadInitial = initialLat != null && initialLon != null;
    const map = L.map(containerRef.current, {
      center: hadInitial ? [initialLat!, initialLon!] : DEFAULT_CENTER,
      zoom: hadInitial ? 14 : 12,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    if (hadInitial) placeMarker(initialLat!, initialLon!);
    map.on("click", (event: L.LeafletMouseEvent) => {
      placeMarker(event.latlng.lat, event.latlng.lng);
    });
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="انتخاب نقطه روی نقشه"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-t-lg bg-surface p-4 sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold">نقطه‌ی محدوده را روی نقشه انتخاب کن</h2>
            <p className="mt-1 text-[11px] leading-6 text-muted">
              اگر موقعیت مکانی را نمی‌دهی، تقریبی هم کافی است: روی نقشه بزن یا نشان را دقیق‌تر بکش.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={containerRef} className="mt-3 h-[300px] w-full rounded-md border border-line sm:h-[340px]" />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] leading-6 text-muted">
            جست‌وجوی فروشگاه‌ها در شعاع {toFaDigits(5)} کیلومتر از نقطه‌ی انتخابی
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 rounded-md border border-line px-3 text-xs text-muted"
            >
              بی‌خیال
            </button>
            <button
              type="button"
              onClick={() => picked && onConfirm(picked.lat, picked.lon)}
              disabled={!picked}
              className="min-h-9 rounded-md bg-accent px-4 text-xs font-bold text-accent-ink disabled:opacity-50"
            >
              ثبت این نقطه
            </button>
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted">نقشه: OpenStreetMap؛ فاصله‌ها تقریبی‌اند.</p>
      </div>
    </div>
  );
}
