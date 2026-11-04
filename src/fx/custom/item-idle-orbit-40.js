// 地面物品待机环绕：物品背后一层微弱光晕，三颗星点贴着地面缓慢绕行，偶尔闪一下。
// 循环；白灰 ramp，进游戏按品质色染色。不用地面环，重心在物品本身。
import { fit, cycle, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Item idle orbit",
  desc: "A faint halo behind a dropped item with three motes circling it low to the floor, each winking as it passes. Loops.",
  tags: ["item", "pickup", "loot", "idle", "aura", "orbit", "loop", "custom"],
  size: [40, 34],
  origin: [20, 26],
  duration: 3.0,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#141414", "#2a2a2a", "#454545", "#666666", "#8f8f8f", "#bdbdbd", "#e8e8e8", "#ffffff"],
    seed: 9,
  },
};

const RAD = 12, SQUASH = 0.34, COUNT = 3;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T;
  const beat = 0.5 + 0.5 * Math.sin(ph * TAU * 2);

  // 地面一层很淡的光池，证明星点是贴着地绕的；不做环绕光晕（暗底上只会糊成灰雾）
  p.glow(0, 0, 8, C[4], 0.10 + 0.03 * beat);

  // 三颗绕行星点：远半圈压暗、近半圈点亮，形成前后的深度
  cycle(t, T, COUNT, o.seed, T, (age, life, r, i) => {
    const a0 = (i / COUNT) * TAU + (age / T) * TAU;
    const rr = RAD + r.range(-1, 1);
    const x = Math.cos(a0) * rr;
    const y = -2 + Math.sin(a0) * rr * SQUASH;
    const near = (Math.sin(a0) + 1) * 0.5; // 0 远 1 近

    const tw = Math.max(0, Math.sin((age / T) * TAU * 2 + i * 2.1)) ** 8;
    const k = 0.45 + 0.55 * near;
    const c = near > 0.7 && tw > 0.3 ? WHITE : C[6];
    p.dot(x, y, c, k);
    p.glow(x + 0.5, y + 0.5, 3.5, C[5], 0.12 + 0.14 * near);

    // 拖影：沿轨道往回取样，让速度看得出来
    for (let s = 1; s <= 3; s++) {
      const a1 = a0 - s * 0.1;
      const x1 = Math.cos(a1) * rr, y1 = -2 + Math.sin(a1) * rr * SQUASH;
      const a2 = a0 - (s - 1) * 0.1;
      p.line(x1, y1, Math.cos(a2) * rr, -2 + Math.sin(a2) * rr * SQUASH,
        s === 1 ? C[5] : C[4], (0.45 - s * 0.1) * (0.35 + 0.65 * near));
    }

    if (tw > 0.45) {
      const s = 1 + tw * 1.5;
      p.line(x - s, y, x + s, y, WHITE, tw * 0.85);
      p.line(x, y - s, x, y + s, WHITE, tw * 0.85);
    }
  });
}
