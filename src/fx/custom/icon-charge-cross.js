// 右键就绪（UI）· 十字闪烁版：参考旧「充能完毕特效」的节奏 —— 中心亮点 → 光球放大到白热
// → 四芒十字冲出 → 收缩消散。一次性，透明背景，64×64 铺在图标上播放。
import { clamp, ease, rand, fit, WHITE } from "../../core/index.js";

export const meta = {
  name: "Icon charge cross",
  desc: "A HUD icon charge pop: a white core swells, four arms shoot out as a bright cross, a ring rolls past, then the afterglow contracts and fades.",
  tags: ["ui", "hud", "icon", "charge", "cross", "flash", "one-shot", "custom"],
  size: [64, 64],
  origin: [32, 32],
  duration: 0.34,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#0A1420", "#12324F", "#1E5C8C", "#2E8FC8", "#63C4F2", "#BCEBFF", "#FFFFFF"],
    seed: 11,
  },
};

// 原时间轴按 0.5s 设计，K 把它压到 meta.duration
const K = 0.34 / 0.5;

export function draw(p, t, o) {
  const C = fit(o.palette, 7);

  // 前期冲出、后期收缩；收尾靠缩小与颜色变暗，不用 alpha（会抖动成棋盘）
  if (t > 0.44 * K) return;
  const raw = t < 0.2 * K
    ? ease.outExpo(clamp(t / (0.16 * K), 0, 1))
    : 1 - ease.inCubic(clamp((t - 0.2 * K) / (0.24 * K), 0, 1));
  const k = Math.max(0.12, raw);
  const heat = clamp(1 - clamp((t - 0.16 * K) / (0.2 * K), 0, 1));
  const col = heat > 0.55 ? WHITE : heat > 0.25 ? C[5] : C[3];

  // 体量：真半透明柔光 + 加法光，托住中心而不遮死图标
  p.disc(0, 0, 8 + 10 * k, C[3], 0.3);
  p.glow(0, 0, 14 + 8 * k, C[4], 0.45 * k);

  // 四芒十字：外蓝内白，尖端收一个小方块
  const len = 4 + 20 * k;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    p.beam(0, 0, dx * len, dy * len, 1.1 + 1.3 * heat, col, 1);
    p.beam(0, 0, dx * len * 0.78, dy * len * 0.78, 0.6, WHITE, 1);
    p.rect(dx * len - 1, dy * len - 1, 2, 2, WHITE, 1);
  }

  // 中心球：小而实，白热时整颗白
  const r = 2 + 6 * k;
  p.circle(0, 0, r, col, 1);
  p.circle(0, 0, r * 0.5, WHITE, 1);

  // 冲击环：沿十字外侧滚一圈
  const q = clamp((t - 0.08 * K) / (0.22 * K), 0, 1);
  if (q > 0 && q < 1) {
    const e = ease.outCubic(q);
    p.ring(0, 0, 6 + 20 * e, 1.2, e < 0.3 ? WHITE : C[4], 1);
    p.glow(0, 0, 6 + 20 * e, C[4], 0.12 * (1 - e));
  }

  // 星点：从臂端甩出，快速熄灭
  for (let i = 0; i < 8; i++) {
    const t0 = K * (0.08 + rand(i, o.seed, 1) * 0.08);
    const age = t - t0;
    const life = K * (0.14 + rand(i, o.seed, 2) * 0.1);
    if (age < 0 || age > life) continue;

    const j = age / life;
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][i % 4];
    const side = (i % 2 ? 1 : -1) * (rand(i, o.seed, 3) - 0.5) * 0.9;
    const ang = Math.atan2(dy, dx) + side;
    const dist = len + 1 + 3 * ease.outCubic(j);
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist;
    const a = (1 - j) * (j < 0.15 ? j / 0.15 : 1);
    const tw = Math.max(0, Math.sin((age / K) * 24 + i)) ** 6;

    p.rect(x - 1, y - 1, 2, 2, tw > 0.4 ? WHITE : C[5], a);
    if (tw > 0.3) {
      p.line(x - 2, y, x + 2, y, WHITE, tw * a);
      p.line(x, y - 2, x, y + 2, WHITE, tw * a);
    }
    p.glow(x, y, 4, C[4], 0.18 * a);
  }
}
