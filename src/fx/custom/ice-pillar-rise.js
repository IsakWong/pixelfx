// 冰柱出现：地面霜环炸开 → 冰体从脚底向上结晶 → 顶端结晶前沿推进 → 溅出冰屑。
// 一次性，末尾定格为完整冰柱（随后由 ice-pillar 循环接住）。
import { fit, clamp, ease, rand, crystal, WHITE } from "../../core/index.js";
import { H, HW } from "./_ice-pillar-shape.js";

export const meta = {
  name: "Ice pillar rise",
  desc: "The pillar erupts from the floor: a frost ring bursts, faceted ice crystallises upward with a bright growing edge, splinters fly off, and it settles into the full frozen shape.",
  tags: ["status", "ice", "freeze", "frozen", "pillar", "rise", "spawn", "one-shot", "custom"],
  size: [48, 48],
  origin: [24, 42],
  duration: 0.42,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"],
    seed: 7,
  },
};

const GROW = 0.26;   // 高度生长完成时刻
const WIDEN = 0.09;  // 底部宽度展开完成时刻

function growAt(t) {
  return ease.outCubic(clamp(t / GROW, 0, 1));
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8);
  const grow = growAt(t);
  const top = -H * grow;
  const widthK = ease.outCubic(clamp(t / WIDEN, 0, 1));

  // 冰体：从地面向上长，始终保持锥形（按当前高度归一化，而不是截头）
  if (grow > 0.02) {
    for (let y = Math.ceil(top); y <= 0; y++) {
      const v = clamp((y - top) / -top, 0, 1);           // 0 = 顶端，1 = 地面
      const h = (HW * Math.pow(v, 0.62) + 0.9) * widthK;
      const fresh = clamp((y - top) / Math.max(1, Math.min(6, -top)), 0, 1);

      for (let x = Math.ceil(-h); x <= Math.floor(h); x++) {
        const d = h - Math.abs(x + 0.5);
        if (d < 0) continue;

        const fx = clamp((x + 0.5) / Math.max(0.9, h), -1, 1);
        let c, a;
        if (fresh < 0.12) c = WHITE, a = 0.95;
        else if (d < 1) c = C[6], a = 0.95;
        else if (fx < -0.55) c = C[5], a = 0.85;
        else if (fx < -0.1) c = C[4], a = 0.8;
        else if (fx < 0.09) c = C[6], a = 0.88;
        else if (fx < 0.5) c = C[3], a = 0.78;
        else if (fx < 0.82) c = C[2], a = 0.82;
        else c = C[1], a = 0.85;

        p.blend(x, y, c, a);
      }
    }

    // 结晶前沿：尖端附近一圈跳动的白点，像冰正在往上凝
    const ht = 3 + rand(0, o.seed, Math.floor(t * 30)) * 2;
    for (let i = 0; i < 7; i++) {
      const x = (rand(i, o.seed, 61) - 0.5) * ht * 2;
      const y = top + rand(i, o.seed, 62) * 4;
      p.dot(x, y, WHITE, 0.6 + 0.4 * rand(i, o.seed, 63));
    }
    p.glow(0, top, 9, C[5], 0.35 * grow);
  }

  // 溅出的冰屑：从结晶前沿甩出去，受重力落回
  for (let i = 0; i < 12; i++) {
    const t0 = 0.05 + rand(i, o.seed, 51) * 0.16;
    const age = t - t0;
    if (age < 0 || age > 0.3) continue;

    const a0 = -Math.PI / 2 + (rand(i, o.seed, 52) - 0.5) * 2.3;
    const sp = 45 + rand(i, o.seed, 53) * 95;
    const vx = Math.cos(a0) * sp, vy = Math.sin(a0) * sp;
    const x = vx * age + (rand(i, o.seed, 54) - 0.5) * 10;
    const y = -H * growAt(t0) - 2 + vy * age + 0.5 * 900 * age * age;

    p.dot(x, y, rand(i, o.seed, 55) > 0.5 ? WHITE : C[6], clamp(1 - age / 0.3, 0, 1));
  }

  // 柱脚冰刺：生长到一半时斜插出来
  if (grow > 0.45) {
    const k = clamp((grow - 0.45) / 0.55, 0, 1);
    crystal(p, -HW + 1, 0, 8 * k, 4 * k, -0.55, C, { glint: 0.42 });
    crystal(p, HW - 2, 0, 10 * k, 5 * k, 0.5, C, { glint: 0.6 });
    crystal(p, -HW + 6, 0, 5 * k, 3 * k, -0.25, C, { glint: -1 });
    crystal(p, HW - 7, 0, 4 * k, 3 * k, 0.2, C, { glint: -1 });
  }
}
