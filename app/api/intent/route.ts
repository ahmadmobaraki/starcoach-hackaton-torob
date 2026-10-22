import { NextResponse } from "next/server";
import { parseIntents } from "@/lib/intent";
import type { Intent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; current?: Partial<Intent> };
    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "متنی برای تحلیل نرسیده است." }, { status: 400 });
    }
    const result = await parseIntents(text, body.current);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "تحلیل متن ناموفق بود." }, { status: 500 });
  }
}
