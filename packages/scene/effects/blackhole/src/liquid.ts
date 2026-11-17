// The level in the guest's screen: a surface in screen space, below which the canvas is the card.
// One GLSL function gives the surface's height at a pixel column; the liquid's body, its meniscus and
// every layer that floats in it use that same function, so they agree to the pixel.
import { ShaderMaterial, Vector3, type IUniform } from "three";
import { BLEND, LIQUID, type LiquidShared } from "./gl";

const VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uPr;
uniform float uLine;   // 0: the body of the liquid, > 0: only the meniscus, with this opacity
uniform float uProbe;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
${LIQUID}
void main() {
  float d = lqSurface(gl_FragCoord.x) - gl_FragCoord.y;
  if (uLine > 0.0) {
    // a hairline lying just under the surface, one CSS px wide
    float m = uLine * (1.0 - smoothstep(0.5 * uPr, 0.5 * uPr + 1.0, abs(d - 0.5 * uPr)));
    if (m <= 0.0 || uProbe > 0.5) discard;
    gl_FragColor = vec4(RIM * m, m);
    return;
  }
  float a = clamp(d + 0.5, 0.0, 1.0);
  if (a <= 0.0) discard;
  gl_FragColor = uProbe > 0.5 ? vec4(0.0, 0.0, 0.0, a) : vec4(uColor * a, a);
}`;

export function liquidMaterial(lq: LiquidShared, pr: IUniform<number>, line: boolean): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { uLq: lq.uLq, uLqR: lq.uLqR, uPr: pr, uColor: { value: new Vector3() }, uLine: { value: line ? 1 : 0 }, uProbe: { value: 0 } },
  });
}
