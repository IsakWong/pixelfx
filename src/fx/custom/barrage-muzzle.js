import { Particles, P, Rng, fit, WHITE, PAL } from "../../core/index.js";

export const meta = {
  name: "Barrage muzzle",
  desc: "An enemy barrage shot: a violet core flares at the muzzle, a ring snaps out and energy motes spray along the aim.",
  tags: ["muzzle", "barrage", "enemy", "magic", "directional", "one-shot"],
  size: [48, 48],
  origin: [10, 32],
  duration: 0.2,
  loop: false,
  fps: 30,
  bg: "none",
  options: {
    palette: PAL.arcane,
    seed: 11,
  },
};

export function create(o) {
  const C = fit(o.palette, 8);
  const R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[6], C[5], C[4]] });

  // 沿发射方向喷出的能量点
  for (let i = 0; i < 12; i++) {
    const a = R.range(-0.4, 0.4);
    const sp = R.range(90, 240);
    ps.spawn(P.SPARK, 2, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.05, 0.16));
  }

  let t = 0;
  return {
    update(dt) {
      t += dt;
      ps.update(dt);
    },
    draw(p) {
      const k = Math.max(0, 1 - t / meta.duration);
      if (k <= 0) return;

      const grow = 1 - k;

      p.glow(1, 0, 9 * k + 2, C[4], 0.7 * k);
      p.disc(1, 0, 1.2 + 2.0 * k, C[6], 0.95);
      p.disc(1, 0, 0.6 + 1.0 * k, WHITE);
      p.ring(1, 0, 2 + 6 * grow, 1, C[5], 0.5 * k);

      ps.draw(p);
    },
  };
}
