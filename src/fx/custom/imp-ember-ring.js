import { Rng, TAU, clamp, ease, fit } from "../../core/index.js";

// 16 PPU 下，圆环起点与弹丸生成的 2.25 格半径对齐。
const ORIGIN_RADIUS = 36;

export const meta = {
  name: "小恶魔环形散射",
  desc: "弹丸从红橙色火环上散开，薄火环碎成沿地飞散的余烬。",
  tags: ["fire", "ground", "release"],
  size: [104, 104],
  origin: [52, 52],
  duration: 0.42,
  fps: 30,
  loop: false,
  bg: "ground",
  options: { palette: ["#552737", "#9d3b3c", "#dc593c", "#ff8c51", "#ffc786", "#fff1ce"], seed: 23 },
};

export function draw(p, t, o) {
  const c = fit(o.palette, 6);
  const rim = 1 - clamp(t / 0.21);
  const radius = ORIGIN_RADIUS + 5 * ease.outCubic(1 - rim);
  if (t < 0.085) {
    p.ring(0, 0, radius, 1, c[2], 1 - t / 0.085);
    p.glowRing(0, 0, radius, 4, c[3], 0.26 * rim);
  }

  const rng = new Rng(o.seed);
  for (let i = 0; i < 14; i++) {
    const angle = (i + rng.range(0, 0.6)) * TAU / 14;
    const width = rng.range(0.16, 0.32);
    const speed = rng.range(16, 38);
    const life = rng.range(0.20, 0.40);
    if (rim > 0) {
      const end = angle + width * rim;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      p.line(x, y, Math.cos(end) * radius, Math.sin(end) * radius, c[3], rim);
      p.dot(x, y, c[5], rim);
    }
    if (t >= life) continue;

    const distance = ORIGIN_RADIUS + t * speed;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const fade = 1 - t / life;
    p.line(x * (1 - 0.035 * fade), y * (1 - 0.035 * fade), x, y, c[2], fade);
    p.dot(x, y, c[4], fade);
  }
}
