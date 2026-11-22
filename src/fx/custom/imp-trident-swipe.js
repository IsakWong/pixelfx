import { Rng, clamp, ease, fit, lerp } from "../../core/index.js";

const HALF_ANGLE = Math.PI * 50 / 180;
const REACH = 28;

export const meta = {
  name: "小恶魔挥击",
  desc: "三叉杖划过近身扇面，明亮刃口带出几粒余火。",
  tags: ["melee", "fire"],
  size: [44, 60],
  origin: [8, 30],
  duration: 0.32,
  fps: 30,
  loop: false,
  bg: "ground",
  options: { palette: ["#4f263b", "#9b3840", "#d65039", "#ff8c51", "#ffc688", "#fff1cc"], seed: 15 },
};

export function draw(p, t, o) {
  const c = fit(o.palette, 6);
  const head = lerp(-HALF_ANGLE + 0.52, HALF_ANGLE, ease.outCubic(clamp(t / 0.10)));
  const tail = lerp(-HALF_ANGLE, HALF_ANGLE - 0.08, ease.inQuad(clamp((t - 0.055) / 0.19)));
  const edge = 1 - clamp((t - 0.075) / 0.16);
  if (edge > 0) {
    p.arc(0, 0, REACH - 2, u => (1 + 4 * u) * edge, tail, head, c[1], edge);
    p.arc(0, 0, REACH - 1, u => (0.8 + 2.2 * u) * edge, tail, head, c[3], edge);
    p.arc(0, 0, REACH, 1, lerp(tail, head, 0.5), head, c[5], edge);
    p.glow(Math.cos(head) * REACH, Math.sin(head) * REACH, 6, c[3], 0.26 * edge);
  }

  const rng = new Rng(o.seed);
  for (let i = 0; i < 9; i++) {
    const along = (i + rng.range(0, 0.65)) / 9;
    const angle = lerp(-HALF_ANGLE, HALF_ANGLE, along);
    const age = t - along * 0.09;
    const life = rng.range(0.13, 0.22);
    const speed = rng.range(19, 32);
    if (age < 0 || age >= life) continue;

    const radius = REACH - 1 + age * speed;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius - age * 8;
    const fade = 1 - age / life;
    p.line(x - 2 * fade, y + fade, x, y, c[2], fade);
    p.dot(x, y, fade > 0.6 ? c[5] : c[3], fade);
  }
}
