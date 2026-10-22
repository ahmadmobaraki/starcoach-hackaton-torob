import type { Intent, OfferWithShop } from "./types";

export function rankOffers(offers: OfferWithShop[], intent: Intent): OfferWithShop[] {
  const prices = offers.map((o) => o.price).filter((p): p is number => p != null);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;

  const ranked = offers.map((offer) => {
    const confirmation = offer.confirmation;
    const stockScore =
      confirmation?.status === "confirmed"
        ? 1
        : confirmation?.status === "pending"
          ? 0.5
          : confirmation?.status === "ambiguous"
            ? 0.35
            : confirmation?.status === "unavailable"
              ? 0
              : 0.45;

    let priceScore = 0.5;
    if (offer.price != null && min != null && max != null) {
      priceScore = max === min ? 0.8 : 1 - (offer.price - min) / (max - min);
    }

    const distanceScore = offer.distanceKm == null ? 0.5 : Math.max(0, 1 - offer.distanceKm / 6);
    const hoursScore = offer.hours.state === "open" ? 1 : offer.hours.state === "unknown" ? 0.5 : 0.3;

    const paymentScore = intent.payment.requireCredit
      ? offer.hasCredit
        ? 1
        : 0
      : intent.payment.creditPreferred
        ? offer.hasCredit
          ? 1
          : 0.55
        : 0.8;

    const warrantyScore =
      offer.warrantyMonths == null
        ? 0.4
        : offer.warrantyMonths >= 18
          ? 1
          : offer.warrantyMonths >= 12
            ? 0.8
            : offer.warrantyMonths > 0
              ? 0.6
              : 0.2;

    const score =
      stockScore * 0.3 +
      priceScore * 0.25 +
      distanceScore * 0.15 +
      hoursScore * 0.12 +
      paymentScore * 0.1 +
      warrantyScore * 0.08;

    const reasons: string[] = [];
    if (confirmation?.status === "confirmed") reasons.push("موجودی را همین حالا تأیید کرد");
    if (offer.price != null && min != null && offer.price === min) reasons.push("ارزان‌ترین قیمت این محدوده");
    if (offer.hours.state === "open") reasons.push(offer.hours.label);
    if (offer.distanceKm != null && offer.distanceKm <= 1.5) reasons.push("نزدیک محدوده انتخابی");
    if (offer.hasCredit) reasons.push("پرداخت اعتباری دارد");
    if ((offer.warrantyMonths ?? 0) >= 18) reasons.push("گارانتی ۱۸ ماه");
    if (offer.shop.fastDelivery) reasons.push("ارسال فوری");

    return {
      ...offer,
      score: Math.round(score * 1000) / 1000,
      reasons: reasons.slice(0, 2),
    };
  });

  return ranked.sort((a, b) => {
    const aConfirmed = a.confirmation?.status === "confirmed" ? 1 : 0;
    const bConfirmed = b.confirmation?.status === "confirmed" ? 1 : 0;
    if (aConfirmed !== bConfirmed) return bConfirmed - aConfirmed;
    return b.score - a.score;
  });
}
