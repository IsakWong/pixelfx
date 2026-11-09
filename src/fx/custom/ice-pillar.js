// 满层冰冻（StateFrozen）的持续表现：下半身被锥形冰柱封住，上尖下宽、多面切角。
// 纯效果（loop）：真半透明冰体、内部冷光呼吸、一道窄高光自下而上扫过、边缘霜点闪烁。
// 冰体逐像素 blend（shade 的 alpha 是抖动，会把内部读成棋盘格）。
import { fit, clamp, rand, mix, crystal, sparkle, TAU, WHITE } from "../../core/index.js";
import { H, HW, halfAt } from "./_ice-pillar-shape.js";

export const meta = {
  name: "Ice pillar",
  desc: "A tapered pillar of faceted ice sealing the lower body: translucent facets with a bright rim and core ridge, a narrow highlight sweeping up, frost glints and icicles at the base.",
  tags: ["status", "ice", "freeze", "frozen", "pillar", "debuff", "loop", "custom"],
  size: [48, 48],
  origin: [24, 42],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"],
    seed: 5,
  },
};

const CRACKS = [
  [[-7, -7], [-3, -14], [3, -11]],
  [[3, -19], [7, -26]],
  [[-5, -22], [-9, -29]],
  [[1, -3], [-2, -9]],
];

// 3/4 俯视的地面接触：柱脚落在一个压扁的椭圆霜环上。前后两半分开画，
// 后半在冰柱之前、前半在冰柱之后，柱脚就"踩"进地面而不是贴在画面平面上。
const PATCH_RX = 21, PATCH_RY = 5.5;
function frostPatch(p, C, front, pulse) {
  for (let y = Math.floor(-PATCH_RY); y <= PATCH_RY; y++) {
    for (let x = Math.floor(-PATCH_RX); x <= PATCH_RX; x++) {
      const d = Math.hypot((x + 0.5) / PATCH_RX, (y + 0.5) / PATCH_RY);
      if (d > 1 || (front ? y < 0 : y >= 0)) continue;
      const rim = d > 0.78;
      const c = rim ? (front ? C[5] : C[3]) : front ? C[2] : C[1];
      const a = rim ? (front ? 0.5 : 0.28) + 0.07 * pulse : front ? 0.3 : 0.2;
      p.blend(x, y, c, a);
    }
  }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), D = meta.duration;
  const u = (t % D) / D;
  const breath = 0.5 + 0.5 * Math.sin(u * TAU);
  const CD = C.map((c) => mix(c, C[0], 0.3)); // 后排冰刺压暗

  // 地面霜环后半 + 后排冰刺（在冰柱之前画）
  frostPatch(p, C, false, breath);
  crystal(p, -9, -2, 5, 3, -0.25, CD, { glint: -1 });
  crystal(p, 8, -2, 4, 3, 0.2, CD, { glint: -1 });

  // 冰柱主体：逐像素真半透明（alpha 混合，不是抖动），角色的轮廓能透出来
  const glintY = -H - 4 + u * (H + 8);
  for (let y = -H; y <= 0; y++) {
    const h = halfAt(y + 0.5);
    for (let x = Math.ceil(-h); x <= Math.floor(h); x++) {
      const d = h - Math.abs(x + 0.5);
      if (d < 0) continue;

      // 顶端整体提白，读起来是"尖"
      if (y < -H + 2) {
        p.blend(x, y, WHITE, 0.95);
        continue;
      }

      const fx = clamp((x + 0.5) / Math.max(0.9, h), -1, 1);
      // 窄高光：斜向 1px 冷白，跟着循环自下而上扫过
      const sweep = Math.abs(y + 0.5 - glintY + x * 0.3);
      const rim = d < 1;
      // 中央棱：1px 宽的微斜亮线，不是整片白条
      const ridge = Math.abs(x + 0.5 - (-1.2 + (y + H) * 0.06)) < 0.65;

      let c, a;
      if (sweep < 0.6 && fx < 0.4) {
        c = C[6];
        a = 0.9;
      } else if (rim) {
        c = C[6];
        a = 0.95;
      } else if (ridge) {
        c = C[6];
        a = 0.9;
      } else if (fx < -0.5) {
        c = C[5];
        a = 0.85;
      } else if (fx < -0.15) {
        c = C[4];
        a = 0.8;
      } else if (fx < 0.55) {
        c = C[3];
        a = 0.78;
      } else if (fx < 0.85) {
        c = C[2];
        a = 0.82;
      } else {
        c = C[1];
        a = 0.85;
      }

      // 贴地两像素压暗，让柱脚有重量
      if (y > -2.5 && !rim) {
        c = C[2];
        a = 0.85;
      }

      p.blend(x, y, c, a);
    }
  }

  // 内部裂纹：细白线，随循环一起明灭
  for (let i = 0; i < CRACKS.length; i++) {
    const k = Math.max(0, Math.sin((u * TAU * 1.5) + i * 1.7)) * 0.4 + 0.1;
    const line = CRACKS[i];
    for (let s = 0; s < line.length - 1; s++) {
      p.line(line[s][0], line[s][1], line[s + 1][0], line[s + 1][1], C[6], k);
    }
  }

  // 地面霜环前半 + 前排冰刺：压在柱脚上，让柱子和地面咬合
  frostPatch(p, C, true, breath);
  crystal(p, -HW + 1, 0, 8, 4, -0.55, C, { glint: 0.42 });
  crystal(p, HW - 2, 0, 10, 5, 0.5, C, { glint: 0.6 });
  crystal(p, -5, 2, 4, 3, -0.2, C, { glint: -1 });
  crystal(p, 6, 3, 5, 3, 0.25, C, { glint: -1 });

  // 轮廓霜点：左右交替，闪一下再暗下去
  for (let i = 0; i < 8; i++) {
    const g = rand(i, o.seed, 9);
    const y = -3 - g * (H - 8);
    const side = i % 2 ? 1 : -1;
    const x = side * (halfAt(y) - 0.3);
    const tw = Math.max(0, Math.sin((u * TAU * 2) + g * TAU)) ** 8;
    if (tw > 0.12) {
      p.dot(x, y, WHITE, tw);
      p.glow(x, y, 4, C[5], 0.16 * tw);
    }
  }

  // 尖端冷光
  p.glow(0, -H + 1, 10, C[5], 0.18 + 0.06 * breath);
  const tw = Math.max(0, Math.sin((u * TAU) + 0.4)) ** 12;
  if (tw > 0.05) sparkle(p, 0.5, -H - 1, 3 * tw, C[6], C[4], tw);
}
