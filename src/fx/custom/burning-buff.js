// 角色身上的持续燃烧 Buff（3/4 俯视角）。挂点在脚底，画布按 24×38 的角色轮廓布置火点：
// 脚、腿、腰、胸、肩、头依次窜起火舌，地面有一圈压扁的暖光，火星上飘、细烟散开，每 0.6 秒爆燃一下。
// 循环动画；不读角色像素，跟随挂点与 AttachmentSpec 缩放。
import { fit, cycle, mix, rng, hex } from "../../core/index.js";
import { tongue, smoke, ember, tnoise, travel } from "../status/_lib.js";

export const meta = {
  name: "Burning buff",
  desc: "A sustained burning buff: flame tongues lick up a 24x38 body from feet to head, with a warm ground glow, rising embers, thin smoke and a flare every 0.6 s.",
  tags: ["custom", "status", "fire", "burn", "buff", "debuff", "loop", "3/4"],
  size: [48, 64],
  origin: [24, 56],
  duration: 1.2,
  loop: true,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
    smoke: "#5b5566",
    seed: 3,
    power: 1,
  },
};

const D = meta.duration, TICK = 0.6;
const since = (t) => (((t % TICK) + TICK) % TICK);
const flare = (t) => Math.exp(-since(t) / 0.12);
// 画布 48x64、原点 (24,56)：局部 x -23..23，y -55..7；飘出画布的火星和烟直接不画
const inside = (x, y) => x > -23 && x < 23 && y > -55 && y < 7;

// 火点：左右两侧沿身体排列，头部单独一处；每处 2~3 根火舌
const PLANS = new Map();
function plan(seed) {
  let list = PLANS.get(seed);
  if (list) return list;
  const R = rng(seed, 0, 51);
  const spots = [
    { x: -8, y: 0, h: 5, side: -1 },
    { x: 7, y: -1, h: 6, side: 1 },
    { x: -1, y: -3, h: 4, side: -1 },
    { x: -6.5, y: -8, h: 6, side: -1 },
    { x: 5.5, y: -10, h: 7, side: 1 },
    { x: 2, y: -14, h: 5, side: 1 },
    { x: -7, y: -18, h: 7, side: -1 },
    { x: 6.5, y: -20, h: 8, side: 1 },
    { x: -2, y: -25, h: 5, side: -1 },
    { x: -8.5, y: -28, h: 7, side: -1 },
    { x: 7, y: -30, h: 7, side: 1 },
    { x: 0, y: -36, h: 6, side: 0 },
  ];
  list = spots.map((sp, i) => {
    const n = sp.side === 0 ? 3 : 2 + (R.next() < 0.45 ? 1 : 0);
    return {
      ...sp,
      x: sp.x + R.range(-0.8, 0.8),
      y: sp.y + R.range(-1.5, 1.5),
      h: sp.h * R.range(0.85, 1.15),
      tongues: Array.from({ length: n }, (_, j) => ({
        dx: (j - (n - 1) / 2) * 1.9 + R.range(-0.6, 0.6),
        h: sp.h * R.range(0.7, 1.3),
        w: R.range(1.15, 1.9),
        n: i * 17 + j * 5 + seed,
      })),
    };
  });
  PLANS.set(seed, list);
  return list;
}

export function drawBack(p, t, o) {
  const F = fit(o.palette, 9).reverse(), fl = flare(t), flick = 0.8 + 0.2 * tnoise(t, D, 7.5, 3);

  // 贴地暖光：3/4 视角下压成椭圆，随火焰呼吸
  p.shade(-24, -7, 24, 8, (x, y, out) => {
    const d = Math.hypot(x / 21, (y - 0.5) / 4.5);
    if (d >= 1) return;
    out.l = mix(F[3], F[4], 0.5);
    out.k = (0.14 + 0.18 * fl) * flick * (1 - d) * (1 - d);
  });

  // 细烟：从肩、头两处飘出，向左上散开
  const list = plan(o.seed);
  const smokeC = mix(hex(o.smoke), F[6], 0.18);
  cycle(t, D, 10, o.seed + 4, (r) => r.range(0.7, 1.05), (age, life, r, i) => {
    const sp = list[i % list.length];
    const x = sp.x + travel(-9, -4, 0.8, age) + Math.sin(age * 4 + i) * 1.1;
    const y = sp.y - 4 - travel(16, 5, 1, age);
    if (!inside(x, y)) return;
    smoke(p, x, y, r.range(1.1, 1.9), age / life, smokeC, 0.85);
  });
}

export function draw(p, t, o) {
  const F = fit(o.palette, 9).reverse(), P = o.power ?? 1, list = plan(o.seed);
  const fl = flare(t), ph = since(t);

  // 火星：从各火点向上飘，随爆燃更密
  cycle(t, D, 20, o.seed + 6, (r) => r.range(0.5, 0.9), (age, life, r, i) => {
    const sp = list[i % list.length];
    const x = sp.x + r.range(-1.5, 1.5) + travel(-10, -5, 1.1, age) + Math.sin(age * 9 + i) * 1.1 * age;
    const y = sp.y - 2 + travel(-r.range(22, 52) * P, -16, 1.3, age);
    if (!inside(x, y)) return;
    ember(p, x, y, age / life, [F[0], F[2], F[4]], age + i, 0.9 + 0.4 * fl);
  });

  // 爆燃的火星向外迸一下
  if (ph < 0.26)
    for (let k = 0; k < list.length; k++)
      for (let j = 0; j < 3; j++) {
        const an = -Math.PI / 2 + (rng(o.seed, k, j, Math.floor(t / TICK)) - 0.5) * 2.4;
        const v = (40 + 60 * rng(o.seed, k, j + 9, 2)) * P;
        const x = list[k].x + Math.cos(an) * travel(v, 0, 3, ph);
        const y = list[k].y - 2 + Math.sin(an) * travel(v, 0, 3, ph) + 55 * ph * ph;
        p.px(x, y, ph < 0.1 ? F[0] : F[2]);
        p.glow(x, y, 3, F[3], 0.35 * (1 - ph / 0.26));
      }

  // 火舌：沿身体从脚烧到头，爆燃时整体拔高
  for (const sp of list) {
    for (const tg of sp.tongues) {
      const h = tg.h * (0.8 + 0.3 * tnoise(t, D, 5, tg.n)) * (1 + 0.9 * fl) * P;
      const sway = sp.side * h * 0.05 + tnoise(t, D, 3, tg.n + 9) * 0.8;
      tongue(p, sp.x + tg.dx, sp.y, h, tg.w * (1 + 0.3 * fl), sway, F, t, D, tg.n);
    }
    // 每处火点的底部暖光，让火苗和身体有接触感
    p.glow(sp.x, sp.y - 2, (8 + 5 * fl) * P, F[4], 0.16 + 0.26 * fl);
  }

  // 整体热度：胸前最旺，随爆燃起落
  p.glow(0, -24, 18 * P, F[3], (0.08 + 0.1 * fl) * P);
}
