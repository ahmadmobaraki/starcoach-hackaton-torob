import { NextResponse } from "next/server";
import { getStoreThreads } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shopId = url.searchParams.get("shopId");
  if (!shopId) return NextResponse.json({ threads: [] });
  return NextResponse.json({ threads: getStoreThreads(shopId) });
}
