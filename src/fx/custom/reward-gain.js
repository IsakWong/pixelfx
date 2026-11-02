// 获得奖励：领取瞬间在角色身上炸开一圈金光，光环自脚底升起掠过全身，金色星屑向上飘散。
// 一次性，结束为空；挂在获得者位置播放（ItemGainFeedbackConfig 的 VFX 字段）。
import { Particles, Lights, P, Rng, fit, clamp, ease, flare, TAU, WHITE } from "../../core/index.js";

export const meta = {
  name: "Reward gain",
  desc: "The moment a reward is claimed: a small gold flash at the chest, a hoop of light climbing from the feet, gold motes spiralling up and twinkling out, warm dust settling.",
  tags: ["reward", "gain", "pickup", "loot", "gold", "buff", "one-shot", "custom"],
  size: [96, 96],
  origin: [48, 78],
  duration: 1,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#2b1a05", "#5e3708", "#a8640c", "#d99a1a", "#f2c94c", "#ffe9a3", "#fffbe0", "#ffffff"],
    seed: 11,
  },
};

const RING_END = 0.55;   // 光环升到头顶并散开
const FLASH = 0.08;

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const lights = new Lights();

  lights.add(0, -18, 18, WHITE, 0.65, 0.06);
  lights.add(0, -16, 22, C[5], 0.45, 0.35);

  // 向上飘散的星屑：围绕身体中轴，外圈更散，越高的越慢
  const motes = [];
  for (let i = 0; i < 32; i++) {
    motes.push({
      a: R.range(0, TAU),
      r: R.range(4, 24),
      y0: -R.range(2, 38),
      rise: R.range(14, 34),
      sway: R.range(1.4, 4),
      ph: R.range(0, TAU),
      t0: R.range(0, 0.18),
      life: R.range(0.55, 0.8),
      hot: R.chance(0.5),
    });
  }

  // 向外飞散的金色尘埃
  for (let i = 0; i < 16; i++) {
    const a = R.range(0, TAU), sp = R.range(22, 65);
    ps.spawn(P.SPARK, R.range(-6, 6), -R.range(6, 22),
      Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.25, 0.5), C[5], 1);
  }

  let t = 0;

  return {
    update(dt) {
      t += dt;
      ps.update(dt);
      lights.update(dt);
    },

    draw(p) {
      // 胸口白光：星芒 + 一枚短促的亮心
      if (t < FLASH) {
        const k = 1 - t / FLASH;
        const cy = -18;
        flare(p, 0, cy, 15 * k, k, C);
        p.circle(0, cy, 1 + k, WHITE);
        p.glow(0, cy, 7, C[5], 0.3 * k);
      }

      // 两道光环：从脚下升起、半径先扩后收，越过身体后散开
      if (t < RING_END) {
        for (let ring = 0; ring < 2; ring++) {
          const q = clamp((t - ring * 0.06) / RING_END, 0, 1);
          if (q <= 0) continue;

          const e = ease.outCubic(q);
          const lift = 1 - Math.pow(1 - q, 2);
          const y = -2 - lift * 40;
          const rx = 7 + 16 * e;
          const a = (1 - q) * (q < 0.08 ? q / 0.08 : 1) * (ring ? 0.55 : 1);

          for (let ang = 0; ang < TAU; ang += 0.07) {
            const x = Math.cos(ang) * rx;
            const yy = y + Math.sin(ang) * rx * 0.26;
            p.dot(x, yy, q < 0.1 ? WHITE : C[5], 0.9 * a);
          }
          p.glow(0, y, rx * 1.1, C[4], 0.22 * a);
        }
      }

      // 星屑：向上飘、左右微摆、闪一下再淡出
      for (const m of motes) {
        const age = t - m.t0;
        if (age < 0 || age > m.life) continue;

        const k = age / m.life;
        const y = m.y0 - m.rise * ease.outCubic(k);
        const x = Math.cos(m.a) * m.r + Math.sin(age * 4 + m.ph) * m.sway;
        const fade = (1 - k) * (k < 0.12 ? k / 0.12 : 1);
        const tw = Math.max(0, Math.sin(age * 14 + m.ph)) ** 6;

        const c = m.hot || tw > 0.6 ? WHITE : C[5];
        p.dot(x, y, c, fade);
        p.glow(x, y, 4, C[4], 0.18 * fade);

        if (tw > 0.4) {
          const s = 1.2 + tw * 1.2;
          p.line(x - s, y, x + s, y, WHITE, tw * fade);
          p.line(x, y - s, x, y + s, WHITE, tw * fade);
        }
      }

      // 残留的暖光随星屑消散
      if (t > 0.15 && t < 1) {
        p.glow(0, -16, 26, C[4], 0.16 * (1 - (t - 0.15) / 0.85));
      }

      ps.draw(p);
      lights.draw(p);
    },
  };
}
