import { band, clamp, ease, fit, lerp, rng, star, TAU } from "../../core/index.js";

const radius = 35;
const groundScale = 0.625;
const lobes = [[-10, -6, 10], [1, -13, 12], [11, -5, 9], [-3, 2, 10]];

export const meta = {
  name: "区域压制爆炸",
  desc: "落点闪白，红橙火团向上迸开，冲击波贴地扫到判定边缘。",
  tags: ["custom", "enemy", "explosion", "impact", "one-shot"],
  size: [80, 68],
  origin: [40, 39],
  duration: 0.55,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#181425", "#3e2731", "#733e39", "#a22633", "#e43b44", "#f77622", "#fee761", "#ffffff"],
    seed: 47,
  },
};

export function draw(p, t, options) {
  if (t >= meta.duration) return;

  const colors = fit(options.palette, 8);
  const wave = t / 0.2;
  if (wave < 1) {
    const edge = lerp(7, radius, ease.outQuart(wave));
    const ramp = wave < 0.38 ? colors.slice(3, 7) : colors.slice(2, 6);
    band(p, 0, 0, edge, groundScale, 2.3 - wave, 1 - 0.76 * wave, ramp,
      (angle) => Math.cos(9 * angle + 0.7) > -0.96 + wave * 1.3);
  }

  const heat = clamp(1 - t / 0.25);
  const bloom = ease.outQuart(clamp(t / 0.13));
  const drift = clamp((t - 0.12) / 0.36);
  if (t < 0.48) {
    const clouds = lobes.map(([x, y, r]) => [
      x * (0.35 + 0.9 * bloom), y * bloom - 7 * drift, r * (0.36 + 0.64 * bloom - 0.72 * drift),
    ]);
    const opacity = 1 - ease.outQuad(drift);
    p.each(-30, -32, 30, 16, (x, y, sx, sy) => {
      let coverage = -1;
      for (const [cx, cy, r] of clouds) {
        coverage = Math.max(coverage, 1 - ((x - cx) ** 2 + ((y - cy) * 0.9) ** 2) / (r * r));
      }
      coverage += 0.08 * Math.sin(x * 0.63 + y * 0.43 - t * 18);
      if (coverage <= 0) return;

      const lit = clamp(0.52 - (x + 1.3 * y) / 60);
      const level = Math.floor(0.75 + 3.9 * heat + 1.25 * coverage + 0.8 * lit);
      p.blendPx(sx, sy, colors[Math.min(level, 6)], opacity * clamp(0.4 + 2 * coverage));
    });
  }

  for (let i = 0; i < 16; i++) {
    const spark = rng(options.seed, i);
    const age = t / spark.range(0.16, 0.43);
    if (age >= 1) continue;

    const angle = (i + spark.range(-0.4, 0.4)) * TAU / 16;
    const dx = Math.cos(angle), dy = Math.sin(angle) * groundScale;
    const distance = lerp(4, spark.range(20, radius - 1), ease.outCubic(age));
    const x = dx * distance;
    const y = dy * distance - spark.range(7, 17) * Math.sin(Math.PI * age);
    const tail = spark.range(2, 6) * (1 - age);
    p.line(x - dx * tail, y - dy * tail, x, y, colors[age < 0.28 ? 6 : age < 0.7 ? 5 : 3]);
  }

  if (t < 0.06) {
    const flash = 1 - t / 0.06;
    p.glow(0, -2, 20, colors[4], flash * 0.72);
    p.poly(star(0, -2, 3 + 3 * flash, 7 + 7 * flash, 6, 0), colors[6]);
    p.poly(star(0, -2, 2 + 2 * flash, 5 + 4 * flash, 6, 0), colors[7]);
  }
}
