// Room spike: clock sync over the Durable Object and a shared flash to eyeball cross-device timing.
const q = new URLSearchParams(location.search);
const room = q.get("r") ?? "spike";
const role = q.get("role") === "host" ? "host" : "guest";
const now = () => performance.timeOrigin + performance.now();
const out = document.getElementById("out")!;
const log: string[] = [];
let peers = 0, offset = 0, bestRtt = Infinity;
const rtts: number[] = [];

const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/room/${room}?role=${role}`);

function render() {
  const sorted = [...rtts].sort((a, b) => a - b);
  out.textContent =
    `room ${room} · ${role} · peers ${peers} · ws ${["connecting", "open", "closing", "closed"][ws.readyState]}\n` +
    `rtt min ${bestRtt === Infinity ? "…" : bestRtt.toFixed(0)} ms · median ${(sorted[sorted.length >> 1] ?? 0).toFixed(0)} ms · offset ${offset.toFixed(0)} ms\n\n` +
    log.slice(-8).join("\n");
}

function ping(n: number) {
  for (let i = 0; i < n; i++) setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ type: "ping", t0: now() })), i * 120);
}

function flashAt(serverAt: number) {
  const wait = serverAt - offset - now();
  if (wait < 0) log.push(`late by ${(-wait).toFixed(0)} ms`);
  setTimeout(() => {
    document.body.style.background = "#fff";
    setTimeout(() => { document.body.style.background = "#000"; }, 150);
  }, Math.max(0, wait));
}

ws.onopen = () => { log.push("connected"); ping(10); render(); };
ws.onclose = () => { log.push("closed"); render(); };
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "pong") {
    const rtt = now() - msg.t0;
    rtts.push(rtt);
    if (rtt < bestRtt) { bestRtt = rtt; offset = msg.server - (msg.t0 + rtt / 2); }
  } else if (msg.type === "peers") {
    peers = msg.count;
  } else if (msg.type === "flash") {
    const oneWay = now() + offset - msg.sent;
    log.push(`flash from ${msg.role}, one-way ≈ ${oneWay.toFixed(0)} ms`);
    flashAt(msg.at);
  }
  render();
};

document.getElementById("flash")!.addEventListener("click", () => {
  const serverNow = now() + offset;
  const at = serverNow + 1500;
  ws.send(JSON.stringify({ type: "flash", at, sent: serverNow, role }));
  log.push("flash scheduled in 1.5 s");
  flashAt(at);
  render();
});
document.getElementById("resync")!.addEventListener("click", () => { rtts.length = 0; bestRtt = Infinity; ping(10); });
setInterval(render, 500);
