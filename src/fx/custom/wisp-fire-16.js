// 16x16 火灵：wisp 形态的小灵魂火焰，核心亮黄白、外焰橙红、下方短尾、火星上飘。
// 循环动画，供伴随单位 idle 使用，不含角色。
import { fit, clamp, cycle, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Wisp fire 16",
  desc: "A 16x16 fire wisp: a soul-flame core with a licking tail and rising embers, looping in place.",
  tags: ["custom", "wisp", "fire", "companion", "loop", "16"],
  size: [16, 16],
  origin: [8, 15],
  duration: 1.6,
  loop: true,
  fps: 12,
  bg: "dark",
  options: {
    palette: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    hover: 7,
    seed: 5,
  },
};

const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8);
  const ph = t / D;
  const bob = Math.round(Math.sin(ph * TAU) * 1);
  const cy = -o.hover + bob;

  // 火焰体：上尖下宽的火苗，占满画布主体
  for (let y = -15; y <= 0; y++) {
    const dy = y + 0.5 - cy;
    if (dy < -7 || dy > 4) continue;
    const up = clamp((dy + 7) / 7, 0, 1);
    const half = dy < 0 ? 0.8 + 4.2 * Math.pow(up, 2.5) : Math.max(1.0, 4.5 - dy * 1.1);
    const wob = Math.sin(y * 1.3 + t * 7 + o.seed) * 0.5 + Math.sin(y * 0.7 - t * 5) * 0.4;

    for (let x = -7; x < 7; x++) {
      const dx = x + 0.5;
      const e = Math.abs(dx) / (half + wob * 0.3);
      if (e > 1) continue;

      const heat = (1 - e) * 0.65 + (1 - Math.abs(dy + 0.5) / 7) * 0.35;
      const c = heat > 0.72 ? C[6] : heat > 0.48 ? C[5] : heat > 0.26 ? C[4] : heat > 0.1 ? C[3] : C[2];
      p.px(x, y, c);
    }
  }

  // 核心白点
  p.px(0, Math.round(cy), WHITE);
  p.px(0, Math.round(cy) + 1, C[6]);

  // 尾巴：紧接主体下沿的短火舌，左右摆动
  for (let j = 0; j <= 2; j++) {
    const sway = Math.round(Math.sin(t * 6 + j * 0.9) * (j * 0.5));
    const yy = Math.round(cy + 4 + j);
    if (yy > 0) break;
    p.px(sway, yy, j === 0 ? C[4] : C[3]);
    if (j === 0) p.px(sway + 1, yy, C[3]);
  }

  // 火星：向上飘并淡出
  cycle(t, D, 4, o.seed, (r) => r.range(0.45, 0.85), (age, life, r) => {
    const x = Math.round(r.range(-3.5, 3.5)), y = Math.round(cy - 4 - age * 11);
    if (y < -15) return;
    const k = 1 - age / life;
    if (k > 0.55) p.px(x, y, C[6]);
    else if (k > 0.25) p.dot(x, y, C[5], k);
  });

  // 冷色没有，暖光收一圈
  p.light(0, Math.round(cy), C[4], 0.18);
}
