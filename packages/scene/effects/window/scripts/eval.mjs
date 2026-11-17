// Runs one async function (given as source text) inside the check harness page and prints its JSON result.
// Usage: node scripts/eval.mjs "async () => { ... }"   (dev server must be running)
import { launch } from "./browser.mjs";
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("http://127.0.0.1:5275/checks/harness.html");
await page.waitForFunction(() => !!window.H);
const fn = process.argv[2];
const out = await page.evaluate(new Function("return (" + fn + ")()"));
console.log(JSON.stringify(out, null, 0));
await browser.close();
