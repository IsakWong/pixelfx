// 冰冻减速状态：细雪从头顶落下、穿过身体落到脚边融化，脚下一圈薄霜随呼吸明灭。
// 纯效果（loop），不读角色像素 —— 挂载点决定位置，尺寸由 AttachmentSpec 按角色高度适配。
import { fit, cycle, rng, clamp, smooth, sparkle, TAU, WHITE } from "../../core/index.js";
import { flakeDesign, snowflake } from "../ice/_lib.js";

export const meta = {
  name: "Chill snow",
  desc: "Slow debuff: fine snow drifts down through the body and melts at the feet, a thin frost ring breathing on the floor and the odd flake twinkling.",
  tags: ["status", "ice", "freeze", "chill", "slow", "snow", "debuff", "loop", "custom"],
  size: [48, 64],
  origin: [24, 56],
  duration: 2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"],
    seed: 3,
    count: 12,
  },
};

const TOP = -52;          // 落雪起点（脚底上方 52px）
const FALL = 52;          // 落程

/** 每片雪花的固定参数：位置、摆幅、相位、旋转、大小、设计。按 seed 缓存。 */
const PLANS = new Map();
function plan(seed, count) {
  const key = seed + ":" + count;
  let list = PLANS.get(key);
  if (list) return list;

  list = [];
  for (let i = 0; i < count; i++) {
    const r = rng(seed, i, 71);
    const big = r.chance(0.3);
    list.push({
      x: r.range(-19, 19),
      sway: r.range(1.2, 3.4),
      phase: r.range(0, TAU),
      spin: r.range(-2.2, 2.2),
      size: big ? r.range(2.9, 3.6) : r.range(1.5, 2.2),
      cool: r.chance(0.45),   // 部分雪花用更冷的短色阶，避免整片纯白
      design: flakeDesign(r),
    });
  }

  PLANS.set(key, list);
  return list;
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), D = meta.duration;
  const planList = plan(o.seed, o.count);

  // 落雪：cycle 保证首尾无缝；每片有独立速度，落到脚底前一像素内淡出
  cycle(t, D, o.count, o.seed, (g) => g.range(1.55, 1.95), (age, life, r, i) => {
    const f = planList[i];
    const u = age / life;
    const y = TOP + FALL * u;
    const x = f.x + Math.sin(age * 2.1 + f.phase) * f.sway;
    const fade = clamp(-y / 3, 0, 1);
    if (fade <= 0) return;

    snowflake(p, x, y, f.size, age * f.spin + f.phase, f.design, f.cool ? C.slice(0, 7) : C, { a: fade });
  });

  // 偶发的碎雪点：更小、更慢，填补大雪花之间的空隙
  cycle(t, D, 8, o.seed + 500, (g) => g.range(1.7, 2), (age, life, r) => {
    const u = age / life;
    const x = r.range(-20, 20) + Math.sin(age * 1.4 + r.range(0, TAU)) * 2.2;
    const y = TOP + FALL * u;
    const fade = clamp(-y / 3, 0, 1);
    if (fade > 0) p.dot(x, y, r.chance(0.4) ? WHITE : C[6], 0.5 * fade);
  });

  // 两处霜光闪一下，避免整幅画面太均匀
  for (let i = 0; i < 2; i++) {
    const g = rng(o.seed, i, 33);
    const x = g.range(-14, 14), y = -g.range(6, 34);
    const tw = Math.max(0, Math.sin(((t / D) * TAU + g.range(0, TAU)) * 2)) ** 10;
    if (tw > 0.05) sparkle(p, x, y, 2.4 * tw, C[6], C[4], tw);
  }

  // 身体周围的冷气：极淡的一层，让雪不只像贴片
  p.glow(0, -20, 26, C[3], 0.05);
}
