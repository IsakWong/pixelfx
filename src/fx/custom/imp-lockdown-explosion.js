import { clamp, ease, fit, rng, star, TAU } from "../../core/index.js";

// 16 PPU 下，三点封锁的 2.2 单位半径约为 35 像素。
const blastRadius = 35;
const blastRadiusSquared = blastRadius * blastRadius;
const clouds = [
  [-13, -5, 9, 0.34],
  [-7, -13, 12, 0.43],
  [5, -10, 11, 0.45],
  [14, -4, 10, 0.35],
  [8, 8, 8, 0.3],
  [-2, 11, 9, 0.31],
  [-10, 5, 11, 0.36],
  [1, -2, 16, 0.25],
];

export const meta = {
  name: "小恶魔封锁爆炸",
  desc: "贴地的火团爆发，碎裂冲击波扩至落点边界，火星和暗烟迅速消散。",
  tags: ["custom", "explosion", "impact", "fire", "enemy", "one-shot"],
  size: [80, 80],
  origin: [40, 40],
  duration: 0.5,
  loop: false,
  fps: 24,
  bg: "dark",
  options: {
    palette: ["#181425", "#3e2731", "#733e39", "#a22633", "#e43b44", "#f77622", "#feae34", "#fee761", "#ffffff"],
    seed: 41,
  },
};

export function draw(p, t, options) {
  if (t >= meta.duration) return;

  const colors = fit(options.palette, 9);
  drawShockwave(p, t, colors);
  drawCloud(p, t, colors);
  drawSparks(p, t, colors, options.seed);

  if (t < 0.045) {
    const flash = 1 - t / 0.045;
    p.poly(star(-1, -2, 1 + 4 * flash, 1 + 11 * flash, 5, -0.9), colors[8]);
  }
}

function drawShockwave(p, t, colors) {
  const age = t / 0.175;
  if (age >= 1) return;

  const radius = 8 + 25.5 * ease.outCubic(age);
  const thickness = 2.4 - 1.3 * age;
  p.shade(-blastRadius, -blastRadius, blastRadius, blastRadius, (x, y) => {
    const distanceSquared = x * x + y * y;
    if (distanceSquared > blastRadiusSquared) return;

    const angle = Math.atan2(y, x);
    const edge = Math.sqrt(distanceSquared) - radius - 0.9 * Math.sin(angle * 9 + 0.4);
    if (Math.abs(edge) > thickness) return;

    const gaps = Math.sin(angle * 5 - 0.6) + 0.45 * Math.cos(angle * 12);
    if (gaps < -1.05 + age * 1.25) return;

    if (edge < -thickness * 0.2) return colors[age < 0.5 ? 4 : 3];
    return colors[age < 0.36 ? 7 : age < 0.68 ? 5 : 4];
  });
}

function drawCloud(p, t, colors) {
  const bloom = ease.outQuart(clamp(t / 0.12));
  const spread = 0.34 + 0.66 * bloom + 0.39 * clamp((t - 0.12) / 0.33);
  const heat = clamp(1 - t / 0.24);
  const puffs = [];
  for (const [x, y, radius, life] of clouds) {
    if (t >= life) continue;
    const coolingAge = clamp((t - 0.095) / (life - 0.095));
    const collapse = ease.outQuad(coolingAge) * 0.55 + ease.inQuad(coolingAge) * 0.45;
    const size = radius * (0.44 + 0.56 * bloom) * (1 - 0.9 * collapse);
    puffs.push({ x: x * spread, y: y * spread - 7 * collapse, sizeSquared: size * size });
  }
  if (puffs.length === 0) return;

  // 火团并集的轮廓按像素上色，靠近中心和左上方的部分更亮。
  p.shade(-30, -34, 30, 31, (x, y) => {
    if (x * x + y * y > blastRadiusSquared) return;

    let coverage = -0.2;
    for (const puff of puffs) {
      const dx = x - puff.x;
      const dy = y - puff.y;
      coverage = Math.max(coverage, 1 - (dx * dx + dy * dy) / puff.sizeSquared);
    }
    const curl = Math.sin(x * 0.57 + y * 0.29 + t * 16) * 0.078 + Math.cos(y * 0.64 - x * 0.22) * 0.04;
    coverage += curl;
    if (coverage <= 0.04) return;

    const light = clamp(0.56 - (x * 0.45 + y * 0.72) / 65);
    if (t >= 0.23) {
      if (t >= 0.36 || coverage < 0.16) return colors[0];
      return colors[coverage * light > 0.4 && t < 0.29 ? 2 : 1];
    }
    if (coverage < 0.12) return colors[t < 0.12 ? 3 : 1];
    const coreX = x + 4 * (1 - 2 * bloom);
    const coreY = y + 3 + bloom * 3;
    const inner = clamp(1 - (coreX * coreX + coreY * coreY) / 520);
    const level = Math.floor(2 + heat * 2.8 + inner * 1.9 + coverage * 0.9 + light * 0.85 + curl * 3);
    return colors[Math.min(t < 0.045 ? 8 : 7, level)];
  });
}

function drawSparks(p, t, colors, seed) {
  for (let i = 0; i < 18; i++) {
    const random = rng(seed, i, 3);
    const age = (t - random.range(0.004, 0.042)) / random.range(0.15, 0.37);
    if (age < 0 || age >= 1) continue;

    const angle = (i + random.range(-0.38, 0.38)) * TAU / 18;
    const reach = random.range(21, 34);
    const distance = 6 + (reach - 6) * ease.outCubic(age);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const x = dx * distance;
    const y = dy * distance;
    const color = colors[age < 0.23 ? 7 : age < 0.48 ? 6 : age < 0.74 ? 5 : 3];
    const trail = random.range(3, 7) * (1 - age);
    if (age < 0.65)
      p.line(x - dx * trail, y - dy * trail, x, y, colors[age < 0.35 ? 5 : 3]);

    p.px(x, y, color);
    if (i % 4 === 0 && age < 0.37)
      p.px(x - dy, y + dx, color);
  }
}
