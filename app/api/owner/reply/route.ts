import { NextResponse } from "next/server";
import { ownerReply } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { threadId?: string; text?: string };
    const threadId = body.threadId?.trim();
    const text = body.text?.trim();
    if (!threadId || !text) {
      return NextResponse.json({ error: "شماره گفت‌وگو و متن پاسخ لازم است." }, { status: 400 });
    }
    const result = await ownerReply(threadId, text.slice(0, 1200));
    if (!result) return NextResponse.json({ error: "این گفت‌وگو پیدا نشد." }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "ثبت پاسخ فروشنده ناموفق بود." }, { status: 500 });
  }
}
