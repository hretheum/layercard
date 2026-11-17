// Which effect build does each entry point load? The host with ?fx=vN must pass fx=vN on to the guest.
// Usage: node scripts/fx-check.cjs [base]   (default https://hretheum.com). Loads pages only; no room is joined.
const { chromium } = require("../node_modules/playwright");
const base = process.argv[2] || "https://hretheum.com";
(async () => {
  const b = await chromium.launch();
  const probe = async (url) => {
    const p = await b.newPage();
    const chunks = [];
    p.on("request", (r) => { const m = r.url().match(/(peel|window|spill|blackhole)-[\w-]+\.js/); if (m) chunks.push(m[0]); });
    await p.goto(url);
    await p.waitForTimeout(2500);
    const info = await p.evaluate(() => ({ guestUrl: window.__layercard?.guestUrl?.replace(/#r=\w+/, "#r=…"), fxtag: document.getElementById("fxtag")?.textContent ?? null }));
    await p.close();
    return { url: url.replace(base, ""), chunks, ...info };
  };
  const urls = ["/k/host/", ...["v2", "v3", "v4", "v5"].map((v) => `/k/host/?fx=${v}`), "/k/#fx=v5"];
  for (const u of urls) console.log(JSON.stringify(await probe(base + u)));
  await b.close();
})();
