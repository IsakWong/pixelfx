// 24x24 受击命中：角色被打中的那一瞬。白闪核心 + 四向不等长星芒，火花向四周弹开、
// 碎屑落地，0.4 秒内收干净。画布按 16 PPU 设计，1x 下正好盖住一个 24 像素高的角色。
import { Particles, Lights, P, Rng, fit, WHITE } from "../../core/index.js";

export const meta = {
  name: "Hurt hit 24",
  desc: "A compact hit landing on a character: a white cross flare over a diamond core, sparks thrown out, grit that falls and fades, all gone in 0.4s.",
  tags: ["custom", "impact", "hit", "hurt", "character", "24", "one-shot"],
  size: [24, 24],
  origin: [12, 12],
  duration: 0.45,
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"],
    seed: 7,
  },
};

// 一条射线：根部粗、尖端细成一根，白色向内、暖黄向外
function ray(p, x, y, a, L, w, C, from = 0) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = from * L; d <= L; d += 0.5) {
    const u = d / L, hw = w * Math.pow(1 - u, 1.7);
    const col = u < 0.34 ? WHITE : u < 0.66 ? C[5] : u < 0.9 ? C[4] : C[3];
    p.px(x + c * d, y + s * d, col);
    if (hw > 0.45)
      for (let o = 0.5; o <= hw; o += 0.5)
        for (const e of [-o, o]) p.px(x + c * d - s * e, y + s * d + c * e, u < 0.34 && o < 1 ? C[5] : C[4]);
  }
}

// 核心：白色钻石，外圈一圈暖色
function diamond(p, x, y, r, C) {
  for (let dy = -r - 1; dy <= r + 1; dy++)
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      const m = Math.abs(dx) + Math.abs(dy);
      if (m <= r) p.px(x + dx, y + dy, WHITE);
      else if (m === r + 1) p.px(x + dx, y + dy, C[3]);
    }
}

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), X = 0, Y = 0, floor = () => 10;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[6], C[5], C[4], C[2]] });
  const lights = new Lights();

  // 四向不等长：上下长、左右短，外加两条斜向碎芒
  const tilt = R.range(-0.12, 0.12);
  const rays = [
    { a: tilt, L: R.range(8.5, 9.5), w: 1.3 },
    { a: Math.PI + tilt, L: R.range(6, 7.5), w: 1.3 },
    { a: -Math.PI / 2 + tilt, L: R.range(7, 8.5), w: 1.3 },
    { a: Math.PI / 2 + tilt, L: R.range(5, 6.5), w: 1.3 },
    { a: -Math.PI / 4 + tilt, L: R.range(3.5, 4.5), w: 0.8 },
    { a: (Math.PI * 3) / 4 + tilt, L: R.range(3.5, 4.5), w: 0.8 },
  ];

  lights.add(X, Y, 9, C[4], 0.3, 0.13);
  lights.add(X, Y, 4, WHITE, 0.4, 0.05);
  lights.add(X, 8, 7, C[3], 0.14, 0.16);

  // 火花：从核心边缘向外弹开。起点先离中心 2px、头部用暖白而不是纯白，
  // 否则 24px 画布上它们会在核心处叠成一团白块。
  for (let i = 0; i < 8; i++) {
    const a = R.range(0, Math.PI * 2), v = R.range(32, 68), r0 = R.range(1.5, 3);
    ps.spawn(P.SPARK, X + Math.cos(a) * r0, Y + Math.sin(a) * r0, Math.cos(a) * v, Math.sin(a) * v - R.range(8, 24),
      R.range(0.1, 0.18), C[5], 1, i > 4 ? R.range(0.01, 0.025) : 0);
  }
  // 碎屑：受重力落到画布下沿，弹一下停住
  for (let i = 0; i < 6; i++) {
    const a = R.range(0, Math.PI * 2), v = R.range(24, 58);
    ps.spawn(P.GRIT, X, Y, Math.cos(a) * v, Math.sin(a) * v - R.range(20, 50),
      R.range(0.2, 0.3), R.pick([C[5], C[4], C[3], C[2]]), 1);
  }

  let t = 0;
  return {
    update(dt) {
      t += dt;
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      ps.draw(p);
      if (t < 0.018) {
        // 白闪英雄帧：整组星芒 + 大钻石
        for (const r of rays) ray(p, X, Y, r.a, r.L, r.w, C);
        diamond(p, X, Y, 2, C);
      } else if (t < 0.05) {
        // 向外拉开、变细，只留一个白点；从 0.35 起画，别让六条射线在中心糊成一坨
        for (const r of rays) ray(p, X, Y, r.a, r.L * 1.15, r.w * 0.5, C, 0.35);
        p.px(X, Y, WHITE);
      } else if (t < 0.095) {
        // 只剩最长的两根尾巴还在烧
        const a = rays[0], b = rays[2];
        ray(p, X, Y, a.a, a.L * 1.25, 0.6, [C[1], C[1], C[2], C[3], C[4], C[5]], 0.35);
        ray(p, X, Y, b.a, b.L * 1.15, 0.6, [C[1], C[1], C[2], C[3], C[4], C[5]], 0.35);
      }

      const pop = Math.exp(-t / 0.04);
      if (pop > 0.02) {
        p.glow(X, Y, 6, C[4], 0.22 * pop);
        p.glow(X, Y, 3, WHITE, 0.12 * pop);
      }
      lights.draw(p);
    },
  };
}
