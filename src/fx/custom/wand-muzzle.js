import { Particles, P, Rng, fit, WHITE, PAL } from "../../core/index.js";

export const meta = {
  name: "Wand fire",
  desc: "A wand's cast: the tip blooms with a white-gold core, two rune rings snap outward and motes drift along the aim.",
  tags: ["muzzle", "magic", "arcane", "cast", "directional", "one-shot"],
  size: [48, 48],
  origin: [10, 32],
  duration: 0.24,
  loop: false,
  fps: 30,
  bg: "none",
  options: {
    palette: PAL.holy,
    seed: 7,
  },
};

export function create(o) {
  const C = fit(o.palette, 8);
  const R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[6], C[5], C[4]] });

  // 沿朝向飘出的魔法光点
  for (let i = 0; i < 10; i++) {
    const a = R.range(-0.35, 0.35);
    const sp = R.range(40, 140);
    ps.spawn(P.SPARK, 2, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.08, 0.22));
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

      // 杖尖核心：白金色，先亮后收
      p.glow(1, 0, 10 * k + 3, C[4], 0.75 * k);
      p.disc(1, 0, 1.4 + 2.2 * k, C[6], 0.95);
      p.disc(1, 0, 0.7 + 1.1 * k, WHITE);

      // 符文环：两圈向外扩散，代替枪口爆闪
      p.ring(1, 0, 2.5 + 7.5 * grow, 1, C[5], 0.55 * k);
      p.ring(1, 0, 1.5 + 4.5 * grow, 1, C[6], 0.4 * k);

      ps.draw(p);
    },
  };
}
