import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import type { Intent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { intent?: Intent; productId?: string };
    if (!body.intent) {
      return NextResponse.json({ error: "نیت خرید مشخص نیست." }, { status: 400 });
    }
    const result = search(body.intent, body.productId);
    if (!result) {
      return NextResponse.json(
        { error: "برای این محدوده یا محصول، قیمت ثبت‌شده‌ای پیدا نشد." },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "جست‌وجو ناموفق بود." }, { status: 500 });
  }
}
