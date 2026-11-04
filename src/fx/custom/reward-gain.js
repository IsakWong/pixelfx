// 获得奖励：金色星屑从四周螺旋收拢，在胸口汇聚成一颗光球；成型时白光一闪，
// 光球随后收缩、沿色阶冷却成余辉散去。一次性，结束为空；挂在获得者位置播放。
import { Rng, fit, clamp, ease, flare, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Reward gain",
  desc: "Gold motes spiral in from every direction and gather into one bright orb at the chest; it flashes white, then shrinks and steps down the ramp to an ember.",
  tags: ["reward", "gain", "pickup", "loot", "gold", "buff", "one-shot", "custom", "converge", "orb"],
  size: [96, 96],
  origin: [48, 78],
  duration: 1.05,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#2b1a05", "#5e3708", "#a8640c", "#d99a1a", "#f2c94c", "#ffe9a3", "#fffbe0", "#ffffff"],
    seed: 11,
  },
};

const CHEST = -18;        // 光球相对锚点的高度（生成时锚点即角色 Head）
const FORM = 0.24;        // 光球开始鼓起来
const ARRIVE = 0.44;      // 最后一颗星屑到位
const BURST = 0.48;       // 白光峰值
const HOLD = 0.62;        // 光球成形后保持到这里
const COOL = 0.43;        // 冷却时长

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed);

  // 星屑：外圈多而慢、内圈少而快，螺旋方向统一
  const motes = [];
  for (let i = 0; i < 34; i++) {
    const shell = R.range(0, 1);
    motes.push({
      a0: R.range(0, TAU),
      r0: 18 + shell * 28,
      spin: R.range(0.8, 2.1),
      squash: R.range(0.5, 0.72),
      t0: R.range(0, 0.14) + (1 - shell) * 0.06,
      arrive: ARRIVE - R.range(0, 0.14),
      hot: R.chance(0.4),
    });
  }

  // 地面上被吸走的暖光尘埃，走平铺的椭圆轨迹
  const dust = [];
  for (let i = 0; i < 16; i++) {
    dust.push({ a0: R.range(0, TAU), r0: R.range(18, 36), t0: R.range(0.05, 0.26), spin: R.range(0.6, 1.4) });
  }

  // 成型后飘出的余烬
  const embers = [];
  for (let i = 0; i < 10; i++) {
    const a = R.range(0, TAU);
    embers.push({ a, sp: R.range(14, 34), t0: HOLD + R.range(0, 0.05), life: R.range(0.16, 0.30) });
  }

  const motePos = (m, k) => {
    const e = ease.inCubic(clamp(k));
    const r = m.r0 * (1 - e);
    const a = m.a0 + m.spin * e;
    return { x: Math.cos(a) * r, y: CHEST + Math.sin(a) * r * m.squash, r };
  };

  let t = 0;

  return {
    update(dt) { t += dt; },

    draw(p) {
      const form = clamp((t - FORM) / (ARRIVE - FORM));
      const formE = ease.outQuad(form);
      const cool = t > HOLD ? clamp((t - HOLD) / COOL) : 0;
      // 峰值 6px 半径；保持期内轻微搏动，冷却时收小、亮度沿色阶退
      const beat = t > BURST && t < HOLD ? 1 + 0.07 * Math.sin((t - BURST) * TAU * 3) : 1;
      const orbR = 6 * formE * beat * (1 - 0.92 * ease.inCubic(cool));
      const orbA = formE * (1 - cool) * (1 - cool);

      // 地面暖光池：汇聚时增强，爆发后收掉
      const poolK = t < BURST ? ease.outCubic(clamp(t / 0.38)) : 1 - ease.outCubic(clamp((t - BURST) / 0.4));
      p.glow(0, 0, 24, C[4], 0.24 * poolK);
      p.glow(0, CHEST, 26, C[4], 0.20 * formE * (1 - cool));

      // 地面尘埃：向中心收拢
      for (const d of dust) {
        if (t < d.t0 || t > ARRIVE) continue;
        const k = clamp((t - d.t0) / (ARRIVE - d.t0));
        const e = ease.inCubic(k);
        const r = d.r0 * (1 - e);
        const a = d.a0 + d.spin * e;
        const fade = Math.min(1, k / 0.15) * Math.min(1, (1 - k) / 0.1);
        p.dot(Math.cos(a) * r, Math.sin(a) * r * 0.22, C[4], 0.55 * fade);
      }

      // 星屑：螺旋内收。拖尾沿曲线采样，不能用直线横切圆心
      for (const m of motes) {
        if (t < m.t0 || t > m.arrive) continue;
        const k = clamp((t - m.t0) / (m.arrive - m.t0));
        const fade = Math.min(1, k / 0.12) * Math.min(1, (1 - k) / 0.06);
        if (fade <= 0) continue;

        const head = motePos(m, k);
        const c = head.r < 6 ? WHITE : m.hot ? C[6] : C[5];

        if (head.r > 9) {
          for (let s = 1; s <= 3; s++) {
            const a0 = motePos(m, k - s * 0.045), a1 = motePos(m, k - (s - 1) * 0.045);
            p.line(a0.x, a0.y, a1.x, a1.y, c, 0.5 * fade * (1 - s * 0.25));
          }
        }
        p.dot(head.x, head.y, c, fade);
        p.glow(head.x, head.y, 3, C[4], 0.14 * fade);

        // 贴近光球时补一个十字，汇聚点才有抓力
        if (head.r < 8) {
          const s = 1 + (8 - head.r) * 0.16;
          p.line(head.x - s, head.y, head.x + s, head.y, WHITE, 0.6 * fade);
          p.line(head.x, head.y - s, head.x, head.y + s, WHITE, 0.6 * fade);
        }
      }

      // 光球：按半径逐级加层；冷却时沿色阶退，不靠 alpha 抖动（抖动会把球打散成棋盘）
      if (orbR > 0.7) {
        const dim = Math.round(clamp(cool) * 3);
        const c0 = C[Math.max(1, 3 - dim)];
        const c1 = C[Math.max(2, 4 - dim)];
        const c2 = C[Math.max(3, 5 - dim)];
        const c3 = C[Math.max(4, 6 - dim)];

        p.glow(0, CHEST, orbR * 2.8, c0, 0.40 * orbA);
        p.glow(0, CHEST, orbR * 1.5, c1, 0.30 * orbA);

        p.circle(0, CHEST, orbR, c0);
        if (orbR >= 2.2) p.circle(0, CHEST, orbR * 0.80, c1);
        if (orbR >= 3.2) p.circle(0, CHEST, orbR * 0.58, c2);
        if (orbR >= 4.2) p.circle(0, CHEST, orbR * 0.34, c3);
        if (orbR >= 4.8) p.circle(0, CHEST, orbR * 0.15, WHITE);
        if (orbR >= 2.6) p.ring(0, CHEST, orbR, 1, c2, 0.9);

        // 放射线：长短交替、缓慢自转，只在球够大时出现
        if (orbR >= 3.4) {
          const rot = t * 1.6;
          for (let i = 0; i < 8; i++) {
            const ang = rot + (i * TAU) / 8;
            const r1 = orbR * (i % 2 ? 1.12 : 1.42);
            p.line(Math.cos(ang) * orbR * 0.72, CHEST + Math.sin(ang) * orbR * 0.72,
              Math.cos(ang) * r1, CHEST + Math.sin(ang) * r1, c2, 0.34 * orbA);
          }
        }
      }

      // 白光英雄帧：约 2 帧纯白，把峰值压出来
      const flashK = clamp(1 - Math.abs(t - BURST) / 0.045);
      if (flashK > 0) {
        p.circle(0, CHEST, 1.6 + 1.4 * flashK, WHITE, flashK);
        flare(p, 0, CHEST, 12 * flashK, flashK, C);
      }

      // 余烬：沿各自方向飘一小段后熄灭
      for (const e of embers) {
        const age = t - e.t0;
        if (age < 0 || age > e.life) continue;
        const k = age / e.life;
        const d = e.sp * (1 - Math.pow(1 - k, 2)) * 0.5;
        const x = Math.cos(e.a) * d, y = CHEST + Math.sin(e.a) * d * 0.9 + age * age * 40;
        p.dot(x, y, k < 0.5 ? C[6] : C[5], (1 - k) * 0.9);
      }
    },
  };
}
