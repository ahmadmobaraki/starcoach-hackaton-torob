import process from "node:process";

const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3010").replace(/\/+$/, "");
let failed = 0;

async function check(name, path, options) {
  try {
    const response = await fetch(base + path, options);
    const body = await response.json().catch(() => null);
    const ok = response.ok;
    console.log(`${ok ? "✓" : "✗"} ${name} ${response.status}`);
    if (!ok) {
      failed += 1;
      console.log("  ", JSON.stringify(body).slice(0, 300));
    }
    return body;
  } catch (error) {
    failed += 1;
    console.log(`✗ ${name}`, error instanceof Error ? error.message : error);
    return null;
  }
}

const health = await check("health", "/api/health");
if (health) console.log(`  shops=${health.shops} products=${health.products} offers=${health.offers} llm=${health.llm}`);

const parsed = await check("intent", "/api/intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "یه گوشی سامسونگ S25 FE ۲۵۶ می‌خوام، تا ۲۰۰ میلیون، امروز می‌رم فردوسی، قسطی هم باشه خوبه.",
  }),
});

if (parsed?.intent) {
  const search = await check("search", "/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: parsed.intent }),
  });
  console.log(`  product=${search?.product?.title ?? "—"} offers=${search?.offers?.length ?? 0}`);

  const run = await check("start run", "/api/confirmations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: parsed.intent, productId: search?.product?.productId }),
  });
  if (run?.threads?.length) {
    const thread = run.threads[0];
    await check("owner reply", "/api/owner/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.threadId, text: "موجوده ۱۸۴٬۶۰۰٬۰۰۰ تومان. تا ۹ شب. گارانتی ۱۸ ماه." }),
    });
    await check("visit plan", "/api/visit-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: run.runId }),
    });
  }
}

console.log(failed === 0 ? "smoke ok" : `smoke failed: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
