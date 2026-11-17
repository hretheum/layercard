// The scene effect. Up to four builds ship side by side ("@effect" = v1 … "@effect-v4", set at build
// time); `?fx=v2` (host, in the query) or `#…&fx=v2` (guest, in the hash) picks one. The host passes
// its choice on in the QR link, so host and guest always run the same build (contract v1.1).
import type { SceneModule } from "../../../packages/scene/types";

const pick = () => {
  const q = new URLSearchParams(location.search).get("fx") ?? new URLSearchParams(location.hash.slice(1)).get("fx");
  if (q === "v1" || q === "v2" || q === "v3" || q === "v4" || q === "v5") return q;
  return FX_DEFAULT;
};
type Fx = "v1" | "v2" | "v3" | "v4" | "v5";
const d = import.meta.env.VITE_FX_DEFAULT;
const FX_DEFAULT: Fx = d === "v2" || d === "v3" || d === "v4" || d === "v5" ? d : "v1";

export const fxName: Fx = pick();
// v1, v2 = peel; v3 = window; v4 = spill; v5 = blackhole. Only the chosen build is downloaded.
const load: Record<Fx, () => Promise<unknown>> = {
  v1: () => import("@effect"),
  v2: () => import("@effect-v2"),
  v3: () => import("@effect-v3"),
  v4: () => import("@effect-v4"),
  v5: () => import("@effect-v5"),
};
export const fx = (await load[fxName]()) as unknown as SceneModule;
/** Query/hash suffix that keeps the chosen build when the card is passed on ("" for the default). */
export const fxParam = fxName === FX_DEFAULT ? "" : `fx=${fxName}`;

export function quality(): "high" | "mid" | "low" {
  const q = new URLSearchParams(location.search).get("q");
  if (q === "high" || q === "mid" || q === "low") return q;
  return "mid";
}

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
