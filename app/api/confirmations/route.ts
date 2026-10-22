import { NextResponse } from "next/server";
import { getRun, startRun } from "@/lib/agent";
import type { Intent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId لازم است." }, { status: 400 });
  }
  const run = getRun(runId);
  if (!run) return NextResponse.json({ error: "این درخواست پیدا نشد." }, { status: 404 });
  return NextResponse.json(run);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { intent?: Intent; productId?: string };
    if (!body.intent) {
      return NextResponse.json({ error: "نیت خرید مشخص نیست." }, { status: 400 });
    }
    const run = startRun(body.intent, body.productId);
    if (!run) {
      return NextResponse.json({ error: "فروشگاهی برای استعلام پیدا نشد." }, { status: 404 });
    }
    return NextResponse.json(run);
  } catch {
    return NextResponse.json({ error: "شروع استعلام ناموفق بود." }, { status: 500 });
  }
}
