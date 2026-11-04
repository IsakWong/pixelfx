// 地面物品待机光环：脚下一圈呼吸的椭圆光环，微粒沿环上升，底下垫一层柔和光池。
// 循环；白灰 ramp，进游戏按品质色染色。
import { fit, cycle, ease, clamp, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Item idle ring",
  desc: "A small breathing ellipse of light on the floor around a dropped item, motes drifting up off its rim, a soft pool underneath. Loops.",
  tags: ["item", "pickup", "loot", "idle", "aura", "ring", "loop", "custom"],
  size: [32, 26],
  origin: [16, 20],
  duration: 2.0,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#141414", "#2a2a2a", "#454545", "#666666", "#8f8f8f", "#bdbdbd", "#e8e8e8", "#ffffff"],
    seed: 3,
  },
};

const RAD = 10, SQUASH = 0.32, COUNT = 8;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T;
  const beat = 0.5 + 0.5 * Math.sin(ph * TAU * 2);

  // 地面光池：比环略大一圈，呼吸两次
  p.glow(0, 0, 14, C[4], 0.16 + 0.05 * beat);

  // 主环：近端最亮、远端退一档；靠色阶区分，不用 alpha 抖动
  ring(p, C, RAD + 0.6 * beat, beat);

  // 微粒：沿环上升、左右微摆、冷却后消失
  cycle(t, T, COUNT, o.seed, (g) => g.range(0.9, 1.5), (age, life, r, i) => {
    const a0 = (i / COUNT) * TAU + t * 0.35;
    const rad = RAD + r.range(-0.3, 1.8);
    const x = Math.cos(a0) * rad + Math.sin(age * 2.4 + i) * 1.2;
    const y = Math.sin(a0) * SQUASH * rad - r.range(8, 13) * age;
    const u = age / life;
    const k = Math.min(1, age / 0.2, (life - age) / 0.45);
    if (k <= 0) return;
    const c = u < 0.2 ? WHITE : u < 0.55 ? C[6] : C[4];
    p.dot(x, y, c, k * 1.2);
    p.glow(x + 0.5, y + 0.5, 3, C[5], 0.13 * k);
  });
}

function ring(p, C, r, lit) {
  const ry = r * SQUASH;
  const hi = lit > 0.5 ? C[7] : C[6];
  const mid = lit > 0.5 ? C[6] : C[5];
  const far = C[4];
  const n = Math.ceil(r);
  // 逐列扫出 1px 椭圆，左右两端补一格接上远/近半圈
  for (let x = -n; x <= n; x++) {
    const t = x / r;
    const y = Math.sqrt(Math.max(0, 1 - t * t)) * ry;
    const yr = Math.round(y);
    p.px(x, yr, Math.abs(t) > 0.85 ? mid : hi);
    p.px(x, -yr, far);
    if (Math.abs(t) > 0.8) p.px(x, yr - 1, mid);
  }
}
