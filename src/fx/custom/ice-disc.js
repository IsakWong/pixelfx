// Ice variant of the energy disc, for JASA's spinning ice dart. A sawblade of ice that turns on its own: hooked
// white-edged teeth, spiral frost arms, a pale hub, sparks flung off the teeth, frost motes and glints.
// The blade is symmetric, so the game may align it to the velocity without it reading wrong.
import { fit, rng, fly, TAU, WHITE, PAL } from "../../core/index.js";
import { beat, spark } from "../projectiles/_lib.js";

export const meta = {
  name: "Ice disc",
  desc: "A spinning sawblade of ice: hooked white-edged teeth, spiral frost arms, a pale hub, cold sparks flung off the teeth and frost motes.",
  tags: ["projectile", "ice", "disc", "saw", "energy", "directional", "loop", "custom"],
  size: [36, 36],
  origin: [18, 18],
  duration: 0.5,
  loop: true,
  fps: 30,
  bg: "sky",
  options: { palette: PAL.ice, size: 8, teeth: 8, seed: 5 },
};

const inside = (x, y) => x > -17 && x < 17 && y > -17 && y < 17;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.size, N = o.teeth, S = o.seed, D = meta.duration;
  const rot = (TAU * 3 * t) / D, seg = TAU / N, frac = (x) => x - Math.floor(x);
  const f = Math.floor(t * 30 + 1e-6), fr = rng(S, 17, f);
  const SP = [WHITE, C[6], C[5], C[4]];

  // sparks flung off the tooth tips along the spin, then left behind in the air
  beat(t, D, 16, S + 3, (r) => r.range(0.1, 0.24), (age, life, r) => {
    const a = rot + r.range(0, TAU), tip = R + 3.5, v = r.range(60, 150);
    const vx = -Math.sin(a) * v, vy = Math.cos(a) * v;
    const [x, y] = fly(Math.cos(a) * tip, Math.sin(a) * tip, vx, vy, age, 40, 2.4);
    if (!inside(x, y)) return;
    spark(p, x, y, vx, vy, 1 - age / life, SP, 0.35, 0.02, 6);
  });

  // frost shed off the rim: short dashes drifting out, thinning and cooling
  beat(t, D, 10, S + 7, (r) => r.range(0.1, 0.2), (age, life, r) => {
    const a = rot + r.range(0, TAU), d0 = R + 1.5, k = 1 - age / life;
    const [x, y] = fly(Math.cos(a) * d0, Math.sin(a) * d0, Math.cos(a) * 14, Math.sin(a) * 14, age, 0, 1.2);
    if (!inside(x, y)) return;
    p.line(x, y, x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5, k > 0.5 ? C[5] : C[4], k);
  });

  // the blade: a pale hub in a dark collar, spiral arms of frost, a bright rim; past the rim, hooked teeth that
  // run white on their leading faces
  p.shade(-R - 5, -R - 5, R + 5, R + 5, (x, y) => {
    const r = Math.hypot(x, y), th = Math.atan2(y, x);
    if (r > R + 4.6) return;
    if (r <= R) {
      if (r < 1.6) return WHITE;
      if (r < 2.6) return C[1];
      if (r > R - 1.2) return C[5];
      const arm = Math.sin(3 * (th - rot * 0.5) - r * 0.85);
      return arm > 0.75 ? C[6] : arm > 0.35 ? C[4] : arm > -0.2 ? C[3] : C[2];
    }
    const ph = frac((th - rot) / seg), h = 4.2 * Math.pow(ph, 1.4);
    if (r - R < h) return ph > 0.86 ? WHITE : ph > 0.6 ? C[6] : ph > 0.35 ? C[5] : C[3];
    if (r - R < 1.6) return C[2];
  });
  // faceted cuts across the body, turning with it
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * TAU) / 4 + 0.3;
    for (let d = 3; d < R - 1; d += 0.5) p.px(Math.cos(a) * d, Math.sin(a) * d, C[5]);
  }
  // a ring of frost at the rim
  p.ring(0, 0, R + 0.5, 1, C[6]);

  // glints riding the rim, and cold light
  for (let i = 0; i < 2; i++) {
    const a = rot + i * Math.PI + fr.range(-0.15, 0.15), gx = Math.cos(a) * (R + 1), gy = Math.sin(a) * (R + 1);
    p.px(gx, gy, WHITE);
    p.glow(gx, gy, 3, C[5], 0.3);
  }
  p.glow(0, 0, 14, C[3], 0.3);
  p.glow(0, 0, 5, C[5], 0.2);
}
