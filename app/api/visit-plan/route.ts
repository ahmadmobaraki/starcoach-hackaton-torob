import { NextResponse } from "next/server";
import { buildVisitPlan } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { runId?: string };
    if (!body.runId) return NextResponse.json({ error: "runId لازم است." }, { status: 400 });
    const plan = buildVisitPlan(body.runId);
    if (!plan) return NextResponse.json({ error: "این درخواست پیدا نشد." }, { status: 404 });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "ساخت برنامه سفر ناموفق بود." }, { status: 500 });
  }
}
