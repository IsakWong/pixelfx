// 3/4 俯视（《挺进地牢》式）火焰爆炸。摄像机在前上方俯下约 35°：地面被垂直压扁，
// 冲击环和焦痕是椭圆；火球是有体积的一团，由多个火团并集出崎岖轮廓，只在外缘压暗边。
// 节奏：白闪 → 火球炸开、白热核心 → 地面冲击环 → 火舌与火星四散 → 烟团升腾变淡 → 焦痕冷却。
import { Rng, fit, clamp, ease, mix, rand, TAU, WHITE, hex } from "../../core/index.js";

export const meta = {
  name: "Top-down fire burst",
  desc: "A 3/4 top-down fire explosion: white flash, a billowing fireball with a white-hot core and spiked rim, elliptical shock rings, sparks, smoke and a cooling scorch.",
  tags: ["custom", "explosion", "fire", "top-down", "3/4", "one-shot", "burst"],
  size: [128, 128],
  origin: [64, 64],
  duration: 1.25,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff8d6"],
    smoke: ["#262029", "#3b3440", "#57505c", "#7d7682"],
    radius: 1,
    seed: 11,
  },
};

const D = meta.duration;
const SY = 0.42; // 地面透视压缩：圆的垂直半径是水平半径的 42%
const SOOT = hex("#141019"), SOOT2 = hex("#201a24");

/** 把一组火团并成一个崎岖的火球：只在外轮廓压暗边，内部按受光与热度上色。 */
function fireMass(p, lobes, t, C, CY) {
  let x0 = 0, y0 = CY, x1 = 0, y1 = CY;
  for (const q of lobes) {
    if (q.r <= 0) continue;
    x0 = Math.min(x0, q.x - q.r - 1); x1 = Math.max(x1, q.x + q.r + 1);
    y0 = Math.min(y0, q.y - q.r - 1); y1 = Math.max(y1, q.y + q.r + 1);
  }
  const n = C.length;
  p.shade(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (x, y) => {
    let best = -1, hot = 0;
    for (const q of lobes) {
      if (q.r <= 0) continue;
      const dx = x - q.x, dy = y - q.y, d = Math.hypot(dx, dy);
      if (d > q.r * 1.32) continue;
      const a = Math.atan2(dy, dx);
      const rr = q.r * (1 + 0.16 * Math.sin(a * 5 + q.seed) + 0.09 * Math.sin(a * 9 - t * 8 + q.ph));
      const cov = (rr - d) / rr;
      if (cov > best) { best = cov; hot = q.heat; }
    }
    if (best <= 0) return;
    if (best < 0.09) return hot > 0.35 ? C[2] : C[1];
    const lit = clamp(0.55 - (x * 0.45 + (y - CY) * 0.72) / 40, 0, 1);
    let h = hot * (0.74 + 0.4 * lit) + (rand(Math.floor(x), Math.floor(y)) - 0.5) * 0.12;
    if (best < 0.24) h -= (0.24 - best) * 0.85;
    return C[clamp(Math.floor(h * (n - 1)), 0, n - 1)];
  });
}

/** 从火球边缘伸出的火舌：根部两像素、尖端收成一点，颜色由内到外变冷。 */
function spike(p, a, r0, len, C, k) {
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  p.line(r0 * ca, r0 * sa, (r0 + len) * ca, (r0 + len) * sa,
    (u) => (u < 0.35 ? C[6] : u < 0.7 ? C[5] : C[4]), k);
  for (const o of [-1, 1]) {
    const w = len * 0.55;
    p.line(r0 * ca + nx * o, r0 * sa + ny * o, (r0 + w) * ca + nx * o * 0.4, (r0 + w) * sa + ny * o * 0.4,
      (u) => (u < 0.4 ? C[5] : C[4]), k * 0.85);
  }
}

/** 贴地椭圆环：实心的一圈冲击波，靠颜色深浅衰减，避免半透明抖动出虚线。 */
function groundRing(p, r, th, k, col, C) {
  if (r < 1 || k <= 0) return;
  p.shade(-r - 2, -r * SY - 2, r + 2, r * SY + 2, (x, y) => {
    const d = Math.hypot(x, y / SY), u = Math.abs(d - r) / th;
    if (u > 1) return;
    // 环随着扩张被撕开：角度上留缺口，别读成一圈完美的土星环
    const a = Math.atan2(y / SY, x);
    const gap = Math.sin(a * 6 + 1.3) + 0.6 * Math.sin(a * 13 - 2.1);
    if (gap < -1.05 + (1 - k) * 1.6) return;
    const c = mix(col, C[1], u * 0.55);
    return mix(c, C[0], 1 - k);
  });
}

export function create(o) {
  const C = fit(o.palette, 8), SC = fit(o.smoke, 4), S = o.seed ?? 11, K = o.radius ?? 1;
  const R = new Rng(S), MAXR = 50 * K, CY = -9; // 火球视觉中心高于地面炸点，读作体积

  const fire = [], smoke = [], sparks = [], embers = [];

  // 炸开的火团：向外、向上翻滚，越老越冷越小
  for (let i = 0; i < 26; i++) {
    const a = R.range(0, TAU), sp = R.range(18, 72) * K;
    fire.push({
      x: Math.cos(a) * R.range(0, 4), y: CY + Math.sin(a) * R.range(0, 3) * 0.6,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.45 - R.range(4, 14),
      life: R.range(0.32, 0.62), max: 0, size: R.range(5, 11) * K,
      delay: R.range(0, 0.08), seed: R.next() * 100, ph: R.next() * TAU, r: 0, heat: 1,
    });
  }
  // 中心火团：速度很慢、活得稍久，保证爆炸前半段中心始终是实心的
  for (let i = 0; i < 4; i++) {
    const a = R.range(0, TAU), sp = R.range(4, 16) * K;
    fire.push({
      x: Math.cos(a) * R.range(0, 3), y: CY + Math.sin(a) * R.range(0, 2),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4 - 4,
      life: R.range(0.34, 0.46), max: 0, size: R.range(9, 13) * K,
      delay: 0, seed: R.next() * 100, ph: R.next() * TAU, r: 0, heat: 1,
    });
  }
  for (const f of fire) f.max = f.life;

  // 外圈烟团：升腾、向外滚、变大变淡
  for (let i = 0; i < 17; i++) {
    const a = R.range(0, TAU), sp = R.range(12, 40) * K;
    smoke.push({
      x: Math.cos(a) * R.range(4, 16), y: CY + Math.sin(a) * R.range(3, 10) * 0.6,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.45 - R.range(12, 28),
      life: R.range(0.55, 0.85), max: 0, size: R.range(5, 10) * K,
      delay: R.range(0.12, 0.28), seed: R.next() * 100, ph: R.next() * TAU,
    });
  }
  for (const f of smoke) f.max = f.life;

  // 火星：先向上抛再落下，在 3/4 视角里读作向四外炸开
  for (let i = 0; i < 40; i++) {
    const a = R.range(0, TAU), sp = R.range(100, 230) * K;
    sparks.push({
      x: Math.cos(a) * R.range(0, 5), y: CY + Math.sin(a) * R.range(0, 3) * 0.6,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.42 - R.range(20, 70),
      life: R.range(0.18, 0.42), max: 0, delay: R.range(0, 0.09), size: R.next() < 0.25 ? 2 : 1,
    });
  }
  for (const f of sparks) f.max = f.life;

  // 余烬：慢、飘、久，撑住衰减段
  for (let i = 0; i < 15; i++) {
    const a = R.range(0, TAU), sp = R.range(18, 62) * K;
    embers.push({
      x: Math.cos(a) * R.range(4, 12), y: CY + Math.sin(a) * R.range(2, 8) * 0.6,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.42 - R.range(8, 26),
      life: R.range(0.5, 0.85), max: 0, delay: R.range(0.08, 0.3), seed: R.next() * 100,
    });
  }
  for (const f of embers) f.max = f.life;

  const step = (list, dt, drag, g = 0) => {
    for (const q of list) {
      if (q.delay > 0) { q.delay -= dt; continue; }
      q.life -= dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vy += g * dt;
      q.vx -= q.vx * drag * dt; q.vy -= q.vy * drag * dt;
    }
  };
  const inside = (x, y) => x > -63 && x < 63 && y > -63 && y < 63;

  let t = 0;

  return {
    update(dt) {
      t += dt;
      step(fire, dt, 2.8);
      for (const q of fire) {
        const age = q.delay > 0 ? 0 : clamp(1 - q.life / q.max, 0, 1);
        q.r = q.size * (0.7 + 0.5 * Math.min(1, age * 3)) * (1 - Math.max(0, age - 0.55) * 0.9);
        q.heat = Math.pow(clamp(1 - age, 0, 1), 0.7);
      }
      step(smoke, dt, 1.0);
      step(sparks, dt, 2.6, 260);
      step(embers, dt, 1.3);
    },
    drawBack(p) {
      // 地面冲击环：只留一圈，细、快、带缺口
      const t0 = 0.02, life = 0.2;
      if (t >= t0 && t <= t0 + life) {
        const u = (t - t0) / life, r = MAXR * (0.28 + 0.72 * ease.outQuart(u));
        groundRing(p, r, (2.6 - 2 * u) * K, Math.pow(1 - u, 1.6), mix(C[7], C[2], Math.pow(u, 0.8)), C);
      }

      // 椭圆焦痕：从炸点长开，热时一圈橙光，冷却成黑灰后淡出
      const sc = clamp((t - 0.03) / 0.14, 0, 1);
      if (sc > 0) {
        const rx = 23 * K * ease.outQuart(sc), ry = rx * SY, fade = t < 0.75 ? 1 : clamp(1 - (t - 0.75) / 0.45, 0, 1);
        if (fade > 0) {
          const heat = Math.pow(clamp(1 - t / 0.7, 0, 1), 1.4);
          for (let y = Math.floor(-ry); y <= ry; y++)
            for (let x = Math.floor(-rx); x <= rx; x++) {
              const a = Math.atan2(y + 0.5, x + 0.5), d = Math.hypot((x + 0.5) / rx, (y + 0.5) / ry);
              const edge = 0.8 + 0.22 * rand(Math.floor(a * 8 + S * 13), Math.floor(a * 5));
              if (d > edge) continue;
              const n = rand(x * 13 + 1, y * 7 - 3), rim = clamp((d / edge - 0.55) / 0.45, 0, 1);
              if (heat > 0.1 && n + heat * 0.9 > 0.66 && rim > 0.3) {
                p.dot(x, y, heat > 0.6 ? C[3] : heat > 0.32 ? C[2] : C[1], fade * 0.85);
              } else p.dot(x, y, n > 0.5 ? SOOT2 : SOOT, fade * (rim < 0.85 ? 1 : 0.5));
            }
        }
      }

      // 地面暖光池
      const warm = Math.pow(clamp(1 - t / 0.7, 0, 1), 1.3);
      if (warm > 0) p.glow(0, 0, 44 * K, C[4], 0.26 * warm);
    },
    draw(p) {
      if (t >= D) return;

      // 白闪：贴地的一团强光，外带一圈短放射线
      if (t < 0.07) {
        const k = 1 - t / 0.07, r = 18 * K * (0.55 + 0.45 * k);
        p.disc(0, CY, r, WHITE, 0.95 * k);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + 0.2, L = (9 + 12 * k) * K;
          p.line(Math.cos(a) * r * 0.6, CY + Math.sin(a) * r * 0.6 * SY, Math.cos(a) * L, CY + Math.sin(a) * L * SY,
            k > 0.5 ? WHITE : C[6], k);
        }
        p.glow(0, CY, 52 * K, C[6], 0.6 * k);
      }

      // 烟：暗色半透明团，左上加一点受光；先画在火后面，免得把火压脏
      for (const q of smoke) {
        if (q.delay > 0 || q.life <= 0) continue;
        const age = 1 - q.life / q.max, r = q.size * (0.7 + Math.min(1, age * 2) * 1.05);
        const a = Math.min(1, age * 8) * Math.pow(q.life / q.max, 1.1) * 0.3;
        const c = mix(SC[0], SC[2], age);
        p.disc(q.x, q.y, r, c, a);
        p.disc(q.x - r * 0.22, q.y - r * 0.3, r * 0.55, mix(SC[1], SC[3], age), a * 0.85);
      }

      // 火球主体：所有火团并成一个整体
      fireMass(p, fire.filter((q) => q.delay <= 0 && q.life > 0), t, C, CY);

      // 白热核心：爆炸刚发生的最亮点，0.24 秒内塌掉
      const coreAge = clamp(t / 0.24, 0, 1);
      if (coreAge < 1) {
        const r = (13 * (1 - coreAge) + 2) * K;
        p.circle(0, CY, r, C[6]);
        p.circle(0, CY, r * 0.58, WHITE);
        p.glow(0, CY, 18 * K, WHITE, 0.38 * (1 - coreAge));
      }

      // 边缘火舌：火球长起来之后再伸出去，短而热
      const tk = t > 0.1 ? clamp(1 - (t - 0.1) / 0.26, 0, 1) : 0;
      if (tk > 0) for (let i = 0; i < 12; i++) {
        const r = rand(i, S, 3), a = (i / 12) * TAU + Math.sin(t * 4 + i) * 0.14 + r * 0.4;
        const base = (15 + 10 * ease.outQuart(clamp(t / 0.2, 0, 1))) * K;
        const len = (3 + 7 * r) * tk * K;
        spike(p, a, base, len, C, tk);
      }

      // 火星：沿速度方向的短尾，白头橙尾
      for (const q of sparks) {
        if (q.delay > 0 || q.life <= 0 || !inside(q.x, q.y)) continue;
        const k = q.life / q.max, sp = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / sp, uy = q.vy / sp;
        const len = Math.min(9, 1.5 + sp * 0.03) * q.size;
        const head = k > 0.55 ? WHITE : k > 0.25 ? C[6] : C[4], tail = k > 0.5 ? C[6] : k > 0.25 ? C[4] : C[2];
        p.line(q.x - ux * len, q.y - uy * len, q.x, q.y, tail, 1);
        p.px(q.x, q.y, head);
        p.glow(q.x, q.y, 3.5, head, 0.32 * k);
      }

      // 余烬：小点、闪烁、冷却
      for (const q of embers) {
        if (q.delay > 0 || q.life <= 0 || !inside(q.x, q.y)) continue;
        const k = q.life / q.max;
        if (k < 0.22 && Math.sin(t * 34 + q.seed) < 0) continue;
        const c = k > 0.65 ? C[6] : k > 0.35 ? C[4] : C[2];
        p.px(q.x, q.y, c);
        p.glow(q.x, q.y, 3, c, 0.28 * k);
      }

      // 火球整体的强光，随冷却塌下去
      const core = Math.pow(clamp(1 - t / 0.55, 0, 1), 1.5);
      if (core > 0) p.glow(0, CY, 22 * K, C[5], 0.38 * core);
    },
  };
}