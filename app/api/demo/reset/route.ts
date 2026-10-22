import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    resetDemo();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "بازنشانی دمو ناموفق بود." }, { status: 500 });
  }
}
