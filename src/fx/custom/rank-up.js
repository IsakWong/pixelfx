// 评分升档（UI）：以档位字为中心的短促爆发 —— 白闪 → 冲击环外扩 → 放射星芒 → 金星四散。
// 一次性，透明背景，铺在档位艺术字上播放；单套序列升/降档共用，所以用中性白 + 金而不是档位色。
import { fit, clamp, ease, rand, flare, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Rank up",
  desc: "A tier-up pop for a HUD letter: a white hero flash, a ring snapping outward, eight rays blooming then pulling back, gold sparkles flung wide and winking out.",
  tags: ["ui", "rank", "rating", "tier", "up", "reward", "one-shot", "custom"],
  size: [109, 109],
  origin: [54, 54],
  duration: 0.55,
  loop: false,
  fps: 15,
  bg: "dark",
  options: {
    palette: ["#3a2606", "#7a4d08", "#c98a12", "#f2c94c", "#ffe9a3", "#fffbe0", "#ffffff"],
    seed: 3,
  },
};

const FLASH = 0.09;
const RING = 0.3;
const RAYS = 0.26;
const R = 46;

export function draw(p, t, o) {
  const C = fit(o.palette, 7);

  // 中心白闪：一枚亮心 + 四芒，只占开头两帧
  if (t < FLASH) {
    const k = 1 - t / FLASH;
    p.circle(0, 0, 2 + 4.5 * k, WHITE);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      p.beam(0, 0, dx * 17 * k, dy * 17 * k, 1, WHITE, k);
    }
    p.glow(0, 0, 16 * k, C[5], 0.55 * k);
  }

  // 放射星芒：八道，先快后慢地抽出，再整体收回
  if (t > 0.03 && t < 0.46) {
    const grow = ease.outExpo(clamp((t - 0.03) / (RAYS - 0.03), 0, 1));
    const fade = 1 - clamp((t - RAYS) / 0.2, 0, 1);
    for (let i = 0; i < 8; i++) {
      const ang = (i * TAU) / 8 + 0.2;
      const len = (i % 2 ? 22 : 38) * grow + 6;
      const ca = Math.cos(ang), sa = Math.sin(ang);

      // 金色外光 + 白色内芯，尖端散成几点
      p.beam(0, 0, ca * len, sa * len, 1.1, i % 2 ? C[3] : C[4], fade * 0.9);
      p.beam(0, 0, ca * len * 0.78, sa * len * 0.78, 0.6, WHITE, fade);
    }
  }

  // 冲击环：两圈错开外扩，边扩边淡
  if (t > 0.04 && t < RING + 0.14) {
    for (let ring = 0; ring < 2; ring++) {
      const q = clamp((t - 0.04 - ring * 0.035) / RING, 0, 1);
      if (q <= 0) continue;

      const e = ease.outCubic(q);
      const r = 7 + (R - 8) * e;
      const a = (1 - e) * (ring ? 0.5 : 1);

      const col = q < 0.35 ? WHITE : C[5];
      p.ring(0, 0, r, Math.max(1, 2.2 * (1 - e)), col, a);
      p.glow(0, 0, r, C[4], 0.18 * a);
    }
  }

  // 金星四散：从中心甩出去，边飞边闪，最后熄灭
  for (let i = 0; i < 12; i++) {
    const t0 = 0.03 + rand(i, o.seed, 1) * 0.12;
    const age = t - t0;
    const life = 0.28 + rand(i, o.seed, 2) * 0.22;
    if (age < 0 || age > life) continue;

    const k = age / life;
    const ang = rand(i, o.seed, 3) * TAU;
    const dist = (10 + 30 * ease.outCubic(k)) * (0.7 + rand(i, o.seed, 4) * 0.6);
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist * 0.85;
    const fade = (1 - k) * (k < 0.1 ? k / 0.1 : 1);
    const tw = Math.max(0, Math.sin(age * 22 + i)) ** 8;

    p.dot(x, y, tw > 0.5 ? WHITE : C[5], fade);
    if (tw > 0.35) {
      const s = 1 + tw * 1.6;
      p.line(x - s, y, x + s, y, WHITE, tw * fade);
      p.line(x, y - s, x, y + s, WHITE, tw * fade);
    }
    p.glow(x, y, 4, C[4], 0.16 * fade);
  }

  // 收尾：中心余晖缓慢熄灭，把画面带空
  if (t > 0.24) {
    const k = 1 - clamp((t - 0.24) / 0.32, 0, 1);
    p.glow(0, 0, 16, C[3], 0.2 * k);
    if (k > 0.5) flare(p, 0, 0, 5 * k, k * 0.6, C);
  }
}
