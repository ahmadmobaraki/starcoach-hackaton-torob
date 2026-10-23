"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toFaDigits } from "@/lib/format";
import type { OfferWithShop } from "@/lib/types";

export default function MapPanel({
  offers,
  onSelect,
  selectedShopId,
}: {
  offers: OfferWithShop[];
  onSelect?: (shopId: string) => void;
  selectedShopId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const valid = offers.filter((o) => o.shop.lat != null && o.shop.lon != null);
    const center: [number, number] = valid[0]
      ? [valid[0].shop.lat!, valid[0].shop.lon!]
      : [35.6949, 51.4118];
    const map = L.map(containerRef.current, {
      center,
      zoom: 15,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;
    group.clearLayers();
    const valid = offers.filter((o) => o.shop.lat != null && o.shop.lon != null);
    const points: [number, number][] = [];

    valid.forEach((offer) => {
      const priceLabel =
        offer.price == null
          ? "نامشخص"
          : offer.price >= 1_000_000
            ? `${toFaDigits(Math.round(offer.price / 1_000_000))} م`
            : toFaDigits(Math.round(offer.price / 1000)) + " هزار";
      const selected = selectedShopId === offer.shop.shopId;
      const icon = L.divIcon({
        className: "",
        html: `<div style="direction:rtl;white-space:nowrap;transform:translate(-50%,-100%);background:${
          selected ? "#9b1c1c" : "#ffffff"
        };color:${selected ? "#ffffff" : "#16211b"};border:1px solid ${
          selected ? "#9b1c1c" : "#ddd7cb"
        };border-radius:999px;padding:5px 8px;font-family:Vazirmatn,Tahoma,sans-serif;font-size:11px;font-weight:700;box-shadow:0 6px 16px rgba(22,33,27,.18);">${priceLabel}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker([offer.shop.lat!, offer.shop.lon!], { icon }).addTo(group);
      marker.bindPopup(
        `<div dir="rtl" style="font-family:Vazirmatn,Tahoma,sans-serif;min-width:150px">
          <div style="font-weight:700;font-size:12px">${offer.shop.name}</div>
          <div style="font-size:11px;color:#5f6b63;margin-top:2px">${offer.hours.label}</div>
        </div>`,
      );
      marker.on("click", () => onSelect?.(offer.shop.shopId));
      points.push([offer.shop.lat!, offer.shop.lon!]);
    });

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 16);
    }
  }, [offers, onSelect, selectedShopId]);

  return <div ref={containerRef} className="h-[320px] w-full rounded-md border border-line" />;
}
