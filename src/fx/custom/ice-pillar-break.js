// 冰柱破碎：白闪封住轮廓 → 碎块向两侧飞散、翻滚落地 → 霜雾与雪点散开 → 地面霜环外扩淡出。
// 一次性，结束为空；与 ice-pillar 共用轮廓，碎块从冰体原位炸开。
import { Particles, Bits, Lights, P, B, Rng, fit, TAU, WHITE } from "../../core/index.js";
import { H, HW, halfAt } from "./_ice-pillar-shape.js";

export const meta = {
  name: "Ice pillar break",
  desc: "The frozen pillar shatters: a white hero frame, faceted shards flung out and tumbling to the floor, cold vapour and snow, a frost ring spreading on the ground.",
  tags: ["ice", "freeze", "frozen", "shatter", "break", "one-shot", "custom"],
  size: [76, 64],
  origin: [38, 52],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"],
    seed: 6,
  },
};

const FLASH = 0.04;

export function create(o) {
  const C = fit(o.palette, 8), R = new Rng(o.seed), floor = () => 0;
  const ps = new Particles({ rng: R, ground: floor, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
  const bits = new Bits({ ground: floor });
  const lights = new Lights();

  lights.add(0, -H * 0.5, 34, WHITE, 0.75, 0.1);
  lights.add(0, -H * 0.45, 30, C[4], 0.45, 0.4);

  // 碎块：从冰体原位炸开，越靠上飞得越高；一半用带明暗的碎晶
  for (let i = 0; i < 30; i++) {
    const y = -R.range(2, H - 3);
    const h = halfAt(y);
    const x = R.range(-h * 0.88, h * 0.88);
    const side = x < 0 ? -1 : 1;
    const up = 0.45 + (-y / H) * 0.95;
    bits.add({
      kind: R.chance(0.22) ? B.CHUNK : B.SHARD,
      x, y,
      vx: side * R.range(20, 60) + R.range(-12, 12),
      vy: -R.range(45, 145) * up,
      g: 0.9, drag: 0.8, bounce: 0.35,
      life: R.range(0.45, 0.88),
      a: R.range(0, TAU), va: R.range(-22, 22),
      s: R.range(1.4, 3),
      c: C[R.int(4, 7)],
      ramp: [C[1], C[3], C[4], C[6], C[7]],
    });
  }

  // 霜雾与散开的雪点
  for (let i = 0; i < 9; i++) {
    ps.spawn(P.VAPOUR, R.range(-10, 10), -R.range(2, 26),
      R.range(-34, 34), -R.range(0, 22), R.range(0.35, 0.62), C[6], R.range(1.8, 3.2));
  }
  for (let i = 0; i < 12; i++) {
    ps.spawn(P.FLAKE, R.range(-8, 8), -R.range(4, H),
      R.range(-30, 30), -R.range(10, 50), R.range(0.45, 0.85),
      R.chance(0.45) ? WHITE : C[6], R.range(0.6, 1.4));
  }
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + R.range(-1.3, 1.3), sp = R.range(60, 140);
    ps.spawn(P.SPARK, R.range(-4, 4), -R.range(6, 20), Math.cos(a) * sp, Math.sin(a) * sp,
      R.range(0.2, 0.4), C[6], 1);
  }

  let t = 0;

  return {
    update(dt) {
      t += dt;
      bits.update(dt);
      ps.update(dt);
      lights.update(dt);
    },

    draw(p) {
      // 白闪：冰柱剪影整体提白，两帧内收掉
      if (t < FLASH) {
        const k = 1 - t / FLASH;
        p.shade(-HW - 5, -H - 2, HW + 5, 1, (px, py, out) => {
          const y = py + 0.5;
          if (y > 0 || y < -H) return;
          if (Math.abs(px + 0.5) > halfAt(y)) return;
          out.c = WHITE;
          out.a = k;
        });
      }

      ps.draw(p, "back");
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
