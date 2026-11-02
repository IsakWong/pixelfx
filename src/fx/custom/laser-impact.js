// A laser collides: the contact flashes as a crisp white diamond inside a short star, and a spray of sparks is
// thrown back along the beam. No long beam is drawn (the game's LineRenderers meet this effect at its origin);
// +X is the laser's travel direction. Loop, drawn as a function of t.
import { fit, rng, wrap, TAU, WHITE, fly } from "../../core/index.js";

export const meta = {
  name: "Laser impact",
  desc: "A laser collision: a crisp white diamond in a short star of taper rays, a hot pulse of light, and a spray of sparks thrown back along the beam.",
  tags: ["impact", "laser", "energy", "spark", "hit", "directional", "loop"],
  size: [56, 44],
  origin: [36, 22],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: { palette: ["#2a0608", "#5c0d10", "#a01e14", "#e8431a", "#ff7a22", "#ffb43c", "#ffe27a", "#ffffff"], seed: 6 },
};

const FPS = 30, D = meta.duration, NF = Math.round(D * FPS);
// keep strays off the canvas edge (0, 0 is the contact; the canvas is 56 x 44 with the origin at 36, 22)
const inside = (x, y) => x > -35 && x < 19 && y > -21 && y < 21;

// one taper ray, white at the root cooling to red at the tip
function ray(p, a, L, w, C) {
  const c = Math.cos(a), s = Math.sin(a);
  for (let d = 0; d <= L; d += 0.5) {
    const u = d / L, hw = w * Math.pow(1 - u, 1.5);
    p.px(c * d, s * d, u < 0.28 ? WHITE : u < 0.58 ? C[6] : u < 0.82 ? C[5] : C[3]);
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
  const C = fit(o.palette, 8), S = o.seed, f = Math.floor(t * FPS + 1e-6) % NF, fr = rng(S, 17, f);
  const ph = t / D, pulse = 0.5 + 0.5 * Math.sin(ph * TAU * 3);

  // the star: rays biased back along the beam, a crisp diamond heart that flickers
  const tilt = fr.range(-0.1, 0.1), k = 0.85 + 0.3 * fr.next();
  const rays = [
    [Math.PI + tilt, 12.5, 1.15],
    [tilt, 3.5, 1.1],
    [-Math.PI / 2 + tilt, 5.5, 1.05],
    [Math.PI / 2 + tilt, 3, 0.9],
    [Math.PI - 0.75 + tilt, 4.5, 0.8],
    [Math.PI + 0.75 + tilt, 4, 0.8],
  ];
  for (const [a, L, w] of rays) ray(p, a, L * k, w, C);
  diamond(p, pulse > 0.55 ? 2 : 1, C);

  // the beam's tip: the game's LineRenderers meet it here, so only a hot smudge of their light is drawn
  p.glowLine(-5, 0, -1, 0, 3, C[5], 0.35);
  p.px(-1, 0, WHITE);

  // sparks thrown back along the beam, a few flung out; each streaks, slows and cools
  for (let i = 0; i < 34; i++) {
    const r = rng(S, i, 7), born = r.next() * D, life = r.range(0.09, 0.28), big = r.next() < 0.22;
    let age = wrap(t - born, D);
    for (; age < life; age += D) {
      const back = r.next() < 0.7, a = back ? Math.PI + r.range(-1.05, 1.05) : r.range(-0.8, 0.8);
      const v = r.range(70, big ? 210 : 160), vx = Math.cos(a) * v, vy = Math.sin(a) * v;
      const [x0, y0] = fly(0, 0, vx, vy, Math.max(0, age - (big ? 0.045 : 0.03)), 260, 2.2);
      const [x, y] = fly(0, 0, vx, vy, age, 260, 2.2);
      if (!inside(x, y)) continue;
      const kk = 1 - age / life;
      p.line(x0, y0, x, y, kk > 0.5 ? C[6] : kk > 0.25 ? C[4] : C[3], 1);
      p.px(x, y, kk > 0.45 ? WHITE : C[5]);
      if (big) p.px(x + 1, y, kk > 0.5 ? C[6] : C[3]);
    }
  }

  // hot chips knocked off the contact, tumbling and cooling
  for (let i = 0; i < 6; i++) {
    const r = rng(S, i, 51), born = r.next() * D, life = r.range(0.22, 0.42);
    let age = wrap(t - born, D);
    for (; age < life; age += D) {
      const a = Math.PI + r.range(-0.9, 0.5), v = r.range(45, 100);
      const [x, y] = fly(0, 0, Math.cos(a) * v, Math.sin(a) * v, age, 420, 2);
      if (!inside(x, y)) continue;
      const kk = 1 - age / life;
      p.px(x, y, kk > 0.55 ? C[5] : kk > 0.25 ? C[3] : C[2]);
    }
  }

  // light: a hot pulse at the contact, low and wide enough to keep the shapes' edges
  p.glow(0, 0, 14 + 3 * pulse, C[4], 0.28);
  p.glow(0, 0, 6, C[5], 0.22);
}
