import { notFound } from "next/navigation";
import { AskClient } from "@/components/AskClient";
import { getRun } from "@/lib/agent";

export const dynamic = "force-dynamic";

export default async function AskPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = getRun(runId);
  if (!run) notFound();
  return <AskClient initialRun={run} />;
}
