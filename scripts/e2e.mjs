import puppeteer from "puppeteer-core";

const base = process.env.BASE_URL || "http://localhost:3010";
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=fa-IR"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("console error:", msg.text());
});
page.on("pageerror", (err) => console.log("pageerror:", err.message));

async function clickText(text) {
  const clicked = await page.evaluate((needle) => {
    const nodes = [...document.querySelectorAll("button,a")];
    const el = nodes.find((node) => (node.textContent || "").includes(needle));
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`not found: ${text}`);
}

await page.goto(base + "/", { waitUntil: "networkidle0" });
await page.screenshot({ path: "/tmp/hamqadam-home.png", fullPage: true });

await clickText("گوشی");
await page.evaluate(() => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  ).set;
  const el = document.getElementById("request");
  setter.call(el, "یه گوشی سامسونگ S25 FE ۲۵۶ می‌خوام، تا ۲۰۰ میلیون، امروز می‌رم فردوسی، قسطی هم باشه خوبه.");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await clickText("فروشگاه‌ها را پیدا کن");
await page.waitForFunction(() => location.pathname === "/results", { timeout: 30000 });
await page.waitForNetworkIdle({ idleTime: 700, timeout: 30000 }).catch(() => {});
await page.screenshot({ path: "/tmp/hamqadam-results.png", fullPage: true });

await clickText("از ۳ فروشگاه بپرس");
await page.waitForFunction(() => location.pathname.startsWith("/ask/"), { timeout: 30000 });
await page.waitForNetworkIdle({ idleTime: 900, timeout: 30000 }).catch(() => {});
const runId = await page.evaluate(() => location.pathname.split("/").pop());
await page.screenshot({ path: "/tmp/hamqadam-ask.png", fullPage: true });

const run = await fetch(`${base}/api/confirmations?runId=${runId}`).then((r) => r.json());
const unavailable = run.threads.find((t) => t.shop.name.includes("نیآرا")) ?? run.threads[0];
await fetch(`${base}/api/owner/reply`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ threadId: unavailable.threadId, text: "این مدل ۲۵۶ تموم شده." }),
});
await new Promise((r) => setTimeout(r, 900));
const run2 = await fetch(`${base}/api/confirmations?runId=${runId}`).then((r) => r.json());
const confirmThread = run2.threads.find((t) => t.shop.name.includes("رووان")) ?? run2.threads.find((t) => t.shop.name.includes("رویار"));
if (confirmThread) {
  await fetch(`${base}/api/owner/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId: confirmThread.threadId, text: "هست ۱۸۴٬۶۰۰٬۰۰۰ تومان. تا ۹ شب. گارانتی ۱۸ ماه." }),
  });
}
await new Promise((r) => setTimeout(r, 2200));
await page.screenshot({ path: "/tmp/hamqadam-ask-updated.png", fullPage: true });

await clickText("برنامه سفر");
await page.waitForFunction(() => location.pathname.startsWith("/plan/"), { timeout: 30000 });
await page.waitForNetworkIdle({ idleTime: 700, timeout: 30000 }).catch(() => {});
await page.screenshot({ path: "/tmp/hamqadam-plan.png", fullPage: true });

await page.goto(base + "/store", { waitUntil: "networkidle0" });
await page.screenshot({ path: "/tmp/hamqadam-store.png", fullPage: true });

console.log("done", runId);
await browser.close();
