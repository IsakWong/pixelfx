// 地面物品待机信标：一道从物品根部向上收细的微光柱，光柱里不断有星点上浮，底部一圈亮环。
// 循环；白灰 ramp，进游戏按品质色染色。远距离也能一眼看见。
import { fit, cycle, clamp, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Item idle beacon",
  desc: "A thin light column tapering up from a dropped item, sparkles rising through it and a bright ring at the base. Loops; reads from across the room.",
  tags: ["item", "pickup", "loot", "idle", "beacon", "pillar", "loop", "custom"],
  size: [24, 40],
  origin: [12, 34],
  duration: 2.4,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#141414", "#2a2a2a", "#454545", "#666666", "#8f8f8f", "#bdbdbd", "#e8e8e8", "#ffffff"],
    seed: 5,
  },
};

const H = 28;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T;
  const breath = 0.5 + 0.5 * Math.sin(ph * TAU);

  // 底部光池 + 亮环
  p.glow(0, 0, 9, C[4], 0.20 + 0.06 * breath);
  baseRing(p, C, 7.5 + 0.5 * breath, 0.55 + 0.2 * breath);

  // 光柱：贴着根部最宽，向上收成一条线。用色阶分层，不能靠 alpha 抖动（会变成棋盘）
  p.glowLine(0, -1, 0, -H, 5, C[4], 0.18 + 0.06 * breath);
  const steps = [C[3], C[4], C[5], C[6]];
  p.shade(-5, -H - 1, 5, 0, (x, y, out) => {
    if (y > -1) return;
    const u = clamp(-y / H);
    const w = 0.5 + 3.4 * (1 - u) * (1 - u);
    const ax = Math.abs(x + 0.5);
    if (ax > w) return;
    const centre = 1 - ax / w;
    const fade = (1 - u) * (0.5 + 0.5 * breath) * Math.min(1, (u + 0.04) / 0.1);
    const s = Math.round(centre * fade * 3);
    if (s <= 0) return;
    out.c = steps[Math.min(3, s)];
    out.a = 1;
  });
  // 中轴亮线
  p.line(0, -2, 0, -H * 0.72, C[7], 0.5 + 0.3 * breath);

  // 光柱里上浮的星点
  cycle(t, T, 6, o.seed, (g) => g.range(0.9, 1.4), (age, life, r, i) => {
    const u = age / life;
    const spread = r.range(-2.4, 2.4) * (1 - u);
    const y = -2 - H * u * r.range(0.8, 1.05);
    const k = Math.min(1, age / 0.2, (life - age) / 0.35);
    if (k <= 0) return;
    const x = spread + Math.sin(age * 3 + i) * 0.6;
    p.dot(x, y, u < 0.3 ? WHITE : C[6], k);
    p.glow(x + 0.5, y + 0.5, 2.5, C[5], 0.12 * k);
  });
}

function baseRing(p, C, r, a) {
  const ry = r * 0.3;
  p.shade(-r - 1, -ry - 1, r + 1, ry + 1, (x, y, out) => {
    const dx = (x + 0.5) / r, dy = (y + 0.5) / ry, d = Math.hypot(dx, dy);
    if (Math.abs(d - 1) > 0.9 / r) return;
    const s = Math.sin(Math.atan2(dy, dx));
    out.c = s > 0.4 ? C[7] : s > -0.3 ? C[6] : C[4];
    out.a = a * (s < 0 ? 0.55 : 1);
  });
}
