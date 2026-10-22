import { NextResponse } from "next/server";
import { getCounts } from "@/lib/db";
import { llmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...getCounts(), llm: llmConfigured() });
  } catch {
    return NextResponse.json({ ok: false, error: "پایگاه‌داده در دسترس نیست." }, { status: 503 });
  }
}
