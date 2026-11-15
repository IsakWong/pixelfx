// 右键就绪（UI）：HUD 技能图标框的点亮特效 —— 四角括号弹入，框线烧到白热，
// 外圈光环越过画布边缘，火花从四角与四边甩出，最后冷却成暗蓝熄灭。
// 一次性，透明背景，64×64 铺在图标上播放；主色走魔力蓝。
import { clamp, ease, rand, fit, WHITE } from "../../core/index.js";

export const meta = {
  name: "Icon charge ready",
  desc: "A HUD icon frame lights up in arcane blue: corner brackets snap on, the rim burns white-hot, an outer ring expands past the edge, sparks fly off, then the afterglow cools away.",
  tags: ["ui", "hud", "icon", "frame", "charge", "ready", "arcane", "one-shot", "custom"],
  size: [80, 80],
  origin: [40, 40],
  duration: 0.6,
  loop: false,
  fps: 15,
  bg: "dark",
  options: {
    palette: ["#081018", "#12314F", "#1E5C8C", "#2E8FC8", "#63C4F2", "#BCEBFF", "#FFFFFF"],
    seed: 7,
  },
};

// 框线对准图标区域的 48×48 矩形；画布留一圈给外扩与火花
const HW = 24;
const HH = 24;
const R = 4;
const FRAME_W = 0.9;

/** 圆角矩形的有符号距离；inset 为负是向内缩。 */
function sdFrame(x, y, inset) {
  const hw = HW + inset;
  const hh = HH + inset;
  const r = R + Math.max(0, inset * 0.6);
  const qx = Math.abs(x) - (hw - r);
  const qy = Math.abs(y) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function drawFrame(p, inset, width, col, a, lightK) {
  if (a <= 0.01) return;
  const r = HW + Math.abs(inset) + 2;
  p.shade(-r, -r, r, r, (x, y, out) => {
    const d = sdFrame(x, y, inset);
    if (Math.abs(d) > width) return;
    const v = 1 - Math.min(1, Math.abs(d) / width);
    out.c = col;
    out.a = a;
    if (lightK > 0) {
      out.l = col;
      out.k = lightK * v;
    }
  });
}

export function draw(p, t, o) {
  const C = fit(o.palette, 7);

  const heat =
    t < 0.16
      ? ease.outQuad(clamp(t / 0.15, 0, 1))
      : 1 - ease.inQuad(clamp((t - 0.16) / 0.24, 0, 1));
  // 收尾用「变暗」而不是降 alpha：半透明在 pixelfx 里是 Bayer 抖动，会把 1px 线打散成虚线
  const cooling = clamp((t - 0.28) / 0.12, 0, 1);
  const vis = t < 0.46 ? 1 : 0;

  // 框线：暗蓝 → 亮蓝 → 白热 → 冷却
  const rimCol = cooling > 0.55 ? C[1] : cooling > 0.2 ? C[2] : heat > 0.82 ? WHITE : heat > 0.45 ? C[5] : C[3];
  drawFrame(p, 0, FRAME_W + heat * 0.25, rimCol, vis, 0.35 * heat * vis);

  // 内芯：白热阶段在框内再压一道细亮线，增加厚度
  if (heat > 0.5) {
    drawFrame(p, -1.5, 0.5, C[4], vis, 0);
  }

  // 四角括号：先弹入，白热时转白。长度即进度，alpha 保持实心
  const cornerK = ease.outExpo(clamp((t + 0.012) / 0.07, 0, 1));
  if (cornerK > 0.01 && vis > 0) {
    const len = 4 + 7 * cornerK;
    const col = cooling > 0.2 ? C[2] : heat > 0.7 ? WHITE : C[5];
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ex = sx * HW;
      const ey = sy * HH;
      p.line(ex, ey, ex - sx * len, ey, col, 1);
      p.line(ex, ey, ex, ey - sy * len, col, 1);
      p.rect(ex - 1, ey - 1, 2, 2, WHITE, 1);
      p.glow(ex, ey, 4, C[4], 0.22 * (1 - cooling));
    }
  }

  // 外扩光环：一圈从边框向外冲，越界前压暗
  const q = clamp((t - 0.1) / 0.22, 0, 1);
  if (q > 0 && q < 1) {
    const e = ease.outCubic(q);
    const col = e < 0.2 ? WHITE : e < 0.45 ? C[4] : e < 0.7 ? C[2] : C[1];
    drawFrame(p, 2 + e * 13, 0.85, col, 1, 0.12 * (1 - e));
  }

  // 火花：从四角与四边中点向外甩出，边飞边闪
  const anchors = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [0, 1], [0, -1], [1, 0], [-1, 0],
  ];
  for (let i = 0; i < 18; i++) {
    const t0 = 0.06 + rand(i, o.seed, 1) * 0.08;
    const age = t - t0;
    const life = 0.2 + rand(i, o.seed, 2) * 0.12;
    if (age < 0 || age > life) continue;

    const k = age / life;
    const [sx, sy] = anchors[i % anchors.length];
    const ang = Math.atan2(sy, sx) + (rand(i, o.seed, 3) - 0.5) * 0.85;
    const bx = sx * (HW - 2) + (rand(i, o.seed, 5) - 0.5) * 2;
    const by = sy * (HH - 2) + (rand(i, o.seed, 6) - 0.5) * 2;
    const dist = (2 + 9 * ease.outCubic(k)) * (0.7 + rand(i, o.seed, 4) * 0.6);
    const x = bx + Math.cos(ang) * dist;
    const y = by + Math.sin(ang) * dist;
    const fade = (1 - k) * (k < 0.12 ? k / 0.12 : 1);
    const tw = Math.max(0, Math.sin(age * 20 + i * 1.7)) ** 6;

    p.rect(x - 1, y - 1, 2, 2, tw > 0.4 ? WHITE : C[5], fade);
    if (tw > 0.3) {
      const s = 2 + tw * 2;
      p.line(x - s, y, x + s, y, WHITE, tw * fade);
      p.line(x, y - s, x, y + s, WHITE, tw * fade);
    }
    p.glow(x, y, 3, C[4], 0.2 * fade);
  }
}
