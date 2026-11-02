// 32x32 冰块：结冰 → 高光 → 裂纹 → 碎裂，不含角色。
// 画布比 16 版多一倍，可以做出倒角、三个切面和更长的裂纹。
import { fit, clamp } from "../../core/index.js";

export const meta = {
  name: "Ice block 32",
  desc: "A 32x32 block of ice forms, glints, cracks and shatters. No character, meant as a freeze overlay.",
  tags: ["ice", "freeze", "block", "32", "overlay"],
  size: [32, 32],
  origin: [16, 31],
  duration: 0.9,
  loop: false,
  fps: 12,
  bg: "dark",
  options: {
    seed: 1,
    palette: ["#0e2340", "#17456b", "#2a7aa8", "#57bfe6", "#bdefff", "#ffffff"],
  },
};

const TOP = -31;
const HALF_BOTTOM = 14;
const HALF_TOP = 12.5;

function halfAt(y) {
  const k = clamp((y - TOP) / -TOP, 0, 1);
  return HALF_TOP + (HALF_BOTTOM - HALF_TOP) * (k * k * (3 - 2 * k));
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
  p.line(-8, 0, 7, 0, C[3], 0.35 * (1 - shatter));

  for (let y = -31; y <= 0; y++) {
    for (let x = -16; x < 16; x++) {
      const cx = x + 0.5;
      if (y < top || y > 0) continue;

      const half = halfAt(y);
      const chamfer = y < top + 3 ? (top + 3 - y) * 1.2 : 0;   // 顶部小倒角
      const ehalf = half - chamfer;
      const d = ehalf - Math.abs(cx);
      if (d < 0) continue;

      // 碎裂按 8x8 的块走：同块像素一起飞，读起来像碎块而不是噪点
      const block = Math.floor((x + 16) / 8) + Math.floor((y + 31) / 8) * 4;
      const br = hash(block, 7);
      if (br < shatter * 1.2) {
        const nx = x + Math.round((br * 2 - 1) * shatter * 6);
        const ny = y - Math.round((0.4 + br * 0.6) * shatter * 4);
        if (nx < -16 || nx > 15 || ny < -31 || ny > 0) continue;
        p.px(nx, ny, br > 0.5 ? C[3] : C[2]);
        continue;
      }

      // 三个切面：左上高光 / 左浅面 / 右深面
      const facet = cx - (y - top) * 0.45;
      const rim = d < 1;
      const highlight = cx < -9 && y < top + 9;
      const lightFace = facet < -2;
      const deep = facet > 6;

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
    if (k > 0.1) p.line(-2, -26, 4, -16, C[5]);
    if (k > 0.4) p.line(4, -16, -3, -6, C[5]);
    if (k > 0.7) p.line(4, -16, 10, -10, C[5]);
  }
}
