// 16x16 冰块：结冰 → 高光 → 裂纹 → 碎裂，不含角色。
// 画布小，细节按 1px 画：边缘一圈亮蓝，内部按切面分深浅，左上一条斜高光。
import { fit, clamp } from "../../core/index.js";

export const meta = {
  name: "Ice block 16",
  desc: "A 16x16 block of ice forms, glints, cracks and shatters. No character, meant as a freeze overlay.",
  tags: ["ice", "freeze", "block", "16", "overlay"],
  size: [16, 16],
  origin: [8, 15],
  duration: 0.9,
  loop: false,
  fps: 12,
  bg: "dark",
  options: {
    seed: 1,
    palette: ["#0e2340", "#17456b", "#2a7aa8", "#57bfe6", "#bdefff", "#ffffff"],
  },
};

const TOP = -15;
const HALF_BOTTOM = 7;
const HALF_TOP = 5.5;

function halfAt(y) {
  const k = clamp((y - TOP) / -TOP, 0, 1);
  return HALF_TOP + (HALF_BOTTOM - HALF_TOP) * k;
}

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function draw(p, t, o) {
  const C = fit(o.palette, 6);
  const u = clamp(t / meta.duration, 0, 0.999);

  const grow = u < 0.15 ? 0.12 + (u / 0.15) * 0.88 : 1;
  const shatter = u > 0.7 ? (u - 0.7) / 0.3 : 0;
  const crack = u > 0.5 && u <= 0.7;
  const top = TOP * (grow * grow * (3 - 2 * grow));

  if (shatter >= 0.97) return;

  // 地面冷光
  p.line(-4, 0, 3, 0, C[3], 0.35 * (1 - shatter));

  for (let y = -15; y <= 0; y++) {
    for (let x = -8; x < 8; x++) {
      const cx = x + 0.5;
      if (y < top || y > 0) continue;

      const half = halfAt(y);
      const d = half - Math.abs(cx);
      if (d < 0) continue;

      // 碎裂按 4x4 的块走：同块像素一起飞，读起来像碎块而不是噪点
      const block = Math.floor((x + 8) / 4) + Math.floor((y + 15) / 4) * 4;
      const br = hash(block, 7);
      if (br < shatter * 1.2) {
        const nx = x + Math.round((br * 2 - 1) * shatter * 3);
        const ny = y - Math.round((0.4 + br * 0.6) * shatter * 2);
        if (nx < -8 || nx > 7 || ny < -15 || ny > 0) continue;
        p.px(nx, ny, br > 0.5 ? C[3] : C[2]);
        continue;
      }

      // 切面：左上亮、右下深，用一条对角线分开
      const facet = cx - (y - top) * 0.55;
      const rim = d < 1;
      const highlight = facet < -4 && y < top + 7;
      const lightFace = facet < -1;
      const deep = facet > 3;

      if (rim) p.blend(x, y, C[4], 0.95);
      else if (highlight) p.blend(x, y, C[5], 0.9);
      else if (lightFace) p.blend(x, y, C[3], 0.7);
      else if (deep) p.blend(x, y, C[1], 0.72);
      else p.blend(x, y, C[2], 0.68);
    }
  }

  // 裂纹：沿冰块的几道折线，逐条亮起
  if (crack) {
    const k = (u - 0.5) / 0.2;
    if (k > 0.1) p.line(-1, -13, 2, -8, C[5]);
    if (k > 0.4) p.line(2, -8, -2, -3, C[5]);
    if (k > 0.7) p.line(2, -8, 5, -5, C[5]);
  }
}
