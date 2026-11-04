// 激光起点：光束从这一点射出，能量在此汇聚。
// 白热核心 + 呼吸的短星芒，沿 +X 向光束里跑的能量脉冲，-X 方向溅出的火星。
// 循环，按 t 绘制；+X 是光束方向，原点在光束起点。
import { fit, rng, wrap, fly, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Laser source",
  desc: "A looping laser origin: a white-hot core in a breathing star of taper rays, energy pulses running out along +X into the beam, sparks shed back from the source.",
  tags: ["custom", "laser", "source", "energy", "directional", "loop"],
  size: [32, 32],
  origin: [16, 16],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#2a0608", "#5c0d10", "#a01e14", "#e8431a", "#ff7a22", "#ffb43c", "#ffe27a", "#ffffff"], seed: 6 },
};

const D = meta.duration;
// 画布局部坐标范围：origin 在中心，x / y ∈ [-16, 15]
const inside = (x, y) => x > -16 && x < 16 && y > -16 && y < 16;

// one taper ray, white at the root cooling to red at the tip
function ray(p, a, L, w, C) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 0; d <= L; d += 0.5) {
    const u = d / L, hw = w * Math.pow(1 - u, 1.5);
    p.px(c * d, s * d, u < 0.3 ? WHITE : u < 0.6 ? C[6] : u < 0.85 ? C[5] : C[3]);
    if (hw > 0.45) for (let o = 0.5; o <= hw; o += 0.5) for (const e of [-o, o]) p.px(c * d - s * e, s * d + c * e, u < 0.4 ? C[5] : C[4]);
  }
}

// a crisp white diamond with a hot rim
function diamond(p, r, C) {
  for (let y = -r - 1; y <= r + 1; y++)
    for (let x = -r - 1; x <= r + 1; x++) {
      const m = Math.abs(x) + Math.abs(y);
      if (m <= r) p.px(x, y, WHITE);
      else if (m === r + 1) p.px(x, y, C[5]);
    }
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8);
  const ph = t / D;
  const breathe = 0.5 + 0.5 * Math.sin(ph * TAU);
  const fast = 0.5 + 0.5 * Math.sin(ph * TAU * 3);
  const tilt = Math.sin(ph * TAU) * 0.07;

  // 星芒：-X 方向最长（能量源这一侧），+X 短一些，交给光束本身延伸
  const rays = [
    [Math.PI + tilt, 7 + breathe * 1.5, 1.0],
    [-Math.PI / 2 + tilt, 4 + breathe, 0.9],
    [Math.PI / 2 + tilt, 4 + breathe, 0.9],
    [Math.PI - 0.9 + tilt, 3.5 + breathe * 0.8, 0.7],
    [Math.PI + 0.9 + tilt, 3.5 + breathe * 0.8, 0.7],
    [tilt, 2.5 + fast * 1.5, 0.8],
  ];
  for (const [a, L, w] of rays) ray(p, a, L, w, C);
  diamond(p, fast > 0.55 ? 2 : 1, C);

  // 向光束里跑出去的能量脉冲；整数周期，循环接缝处不断
  for (let i = 0; i < 3; i++) {
    const u = (ph * 2 + i / 3) % 1;
    const x = 2 + u * 6, k = Math.sin(u * Math.PI);
    if (k <= 0.15) continue;
    p.dot(x, 0, C[5], k * 0.8);
    if (k > 0.45) {
      p.px(Math.round(x), -1, C[4]);
      p.px(Math.round(x), 1, C[4]);
    }
  }

  // 沿光束方向的短光带，把起点和 LineRenderer 接上
  p.glowLine(1, 0, 7, 0, 2.5, C[5], 0.22);

  // 溅出的火星：背着光束为主，少量全向；每条带拖尾，快、短、亮
  const S = o.seed;
  for (let i = 0; i < 40; i++) {
    const r = rng(S, i, 23), born = r.next() * D, life = r.range(0.07, 0.26), big = r.next() < 0.25;
    let age = wrap(t - born, D);
    for (; age < life; age += D) {
      const back = r.next() < 0.7, a = back ? Math.PI + r.range(-1.15, 1.15) : r.range(-0.95, 0.95);
      const v = r.range(70, big ? 250 : 190);
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      const [x0, y0] = fly(0, 0, vx, vy, Math.max(0, age - (big ? 0.05 : 0.03)), 280, 2.2);
      const [x, y] = fly(0, 0, vx, vy, age, 280, 2.2);
      if (!inside(x, y)) continue;
      const k = 1 - age / life;
      p.line(x0, y0, x, y, k > 0.5 ? C[6] : k > 0.25 ? C[4] : C[3], 1);
      p.px(x, y, k > 0.45 ? WHITE : C[5]);
      if (big) p.px(x + 1, y, k > 0.5 ? C[6] : C[3]);
    }
  }

  // 核心边缘的噼啪电光：整数周期闪烁，接缝处不断
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.sin(ph * TAU * 2 + i) * 0.35;
    if (Math.sin(ph * TAU * 5 + i * 1.7) <= 0.45) continue;
    const rr = 3 + (i % 3);
    const x = Math.round(Math.cos(a) * rr), y = Math.round(Math.sin(a) * rr);
    if (!inside(x, y)) continue;
    p.px(x, y, WHITE);
    p.dot(x + Math.round(Math.cos(a)), y + Math.round(Math.sin(a)), C[6], 0.6);
  }

  // 被推开的碎屑：更慢、更小，沉淀在火花后面
  for (let i = 0; i < 8; i++) {
    const r = rng(S, i, 61), born = r.next() * D, life = r.range(0.2, 0.42);
    let age = wrap(t - born, D);
    for (; age < life; age += D) {
      const a = Math.PI + r.range(-1.0, 0.7), v = r.range(35, 80);
      const [x, y] = fly(0, 0, Math.cos(a) * v, Math.sin(a) * v, age, 300, 2);
      if (!inside(x, y)) continue;
      const k = 1 - age / life;
      p.px(x, y, k > 0.55 ? C[5] : k > 0.25 ? C[3] : C[2]);
    }
  }

  // 光：核心亮、外圈宽
  p.glow(0, 0, 7 + 2 * breathe, C[4], 0.3);
  p.glow(0, 0, 3.5, C[5], 0.3);
}
