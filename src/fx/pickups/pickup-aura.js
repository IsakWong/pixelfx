// The floor ring and its light follow Sprite Fusion's open-source pickup (https://www.spritefusion.com/pixel-art-vfx/pickup),
// MIT License, Copyright (c) 2026 Hugo Duprez. The item itself is left out: motes rise round the space it stands in.
import { PAL, fit, cycle, ease, TAU, WHITE } from "../../core/index.js";
import { pool, glint } from "./_lib.js";

export const meta = {
  name: "Pickup aura",
  desc: "A pool of light on the floor with a clean ring and motes rising and cooling round the empty space an item stands in.",
  tags: ["pickup", "item", "loot", "aura", "ring", "glow", "loop"],
  size: [72, 56],
  origin: [36, 48],
  duration: 1.8,
  loop: true,
  fps: 15,
  bg: "ground",
  options: { palette: PAL.gold, seed: 7 },
};

const RAD = 15, SQUASH = 0.24, COUNT = 14;

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T, beat = 0.5 + 0.5 * Math.sin(ph * TAU * 2);
  // a pool of light under the item, breathing twice a loop
  pool(p, 0, 0.5, 16, 3.8, C[4], 0.22 + 0.07 * beat);
  pool(p, 0, 0.5, 6.5, 1.8, C[6], 0.11 + 0.05 * beat);
  rim(p, C, RAD, 0.8, true);
  pulse(p, C, ph, true);
  motes(p, C, t, T, ph, o.seed, true);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, ph = t / T, beat = 0.5 + 0.5 * Math.sin(ph * TAU * 2);
  rim(p, C, RAD, 0.95 + 0.1 * beat, false);
  pulse(p, C, ph, false);
  motes(p, C, t, T, ph, o.seed, false);
}

// a clean 1 px ellipse on the floor: bright where it faces the viewer, dimmer round the back; a thin darker
// line just inside the near rim rolls the light over an edge
function rim(p, C, r, a, back) {
  const ry = r * SQUASH, top = C[6], side = C[5], far = C[4], in1 = C[3];
  p.shade(-r - 1, -ry - 1, r + 1, ry + 1, (x, y, out) => {
    const dx = (x + 0.5) / r, dy = (y + 0.5) / ry, d = Math.hypot(dx, dy);
    if (Math.abs(d - 1) > 0.85 / r) return;
    const s = Math.sin(Math.atan2(dy, dx));
    if ((s < 0) !== back) return;
    out.c = s > 0.55 ? top : s > -0.15 ? side : far;
    out.a = a * (s < 0 ? 0.55 : 1);
  });
  if (!back)
    p.shade(-r + 1, 0, r - 1, ry + 1, (x, y, out) => {
      const dx = (x + 0.5) / (r - 1), dy = (y + 0.5) / (ry - 0.6), d = Math.hypot(dx, dy);
      if (d > 1 || d < 1 - 1.6 / r) return;
      out.c = in1;
      out.a = a * 0.3;
    });
}

// one ring of light spreading out across the floor a loop, thinning and dying as it goes
function pulse(p, C, ph, back) {
  const u = ph / 0.8;
  if (u >= 1) return;
  const r = RAD - 2 + 9 * ease.outCubic(u), k = (1 - u) * 0.55;
  const ry = r * SQUASH;
  p.shade(-r - 1, -ry - 1, r + 1, ry + 1, (x, y, out) => {
    const dx = (x + 0.5) / r, dy = (y + 0.5) / ry, d = Math.hypot(dx, dy);
    if (Math.abs(d - 1) > 0.9 / r) return;
    if ((Math.sin(Math.atan2(dy, dx)) < 0) !== back) return;
    out.c = u < 0.15 ? C[5] : C[4];
    out.a = k;
  });
}

// motes rising just outside the ring at their own angle, swaying and cooling from white to the ramp's mid
// tones; a few twinkle. The middle stays clear for the item.
function motes(p, C, t, T, ph, seed, back) {
  const drift = ph * TAU * 0.25;
  cycle(t, T, COUNT, seed, (g) => g.range(0.8, 1.5), (age, life, r, i) => {
    const a0 = (i / COUNT) * TAU + r.range(-0.08, 0.08) + drift, rad = RAD + r.range(-0.5, 2.5);
    if (Math.sin(a0) < 0 !== back) return;
    const u = age / life, spd = r.chance(0.35) ? r.range(22, 34) : r.range(8, 15);
    const x = Math.cos(a0) * rad + Math.sin(age * r.range(1.6, 3.2) + i) * 1.4;
    const y = Math.sin(a0) * SQUASH * rad - spd * age;
    // fade before the canvas edge instead of clipping there
    const k = Math.min(1, age / 0.2, (life - age) / 0.4, (44 + y) / 6) * (1 - 0.45 * u);
    if (k <= 0) return;
    if (r.chance(0.1)) {
      const tw = 0.5 + 0.5 * Math.sin(age * r.range(10, 15) + i);
      if (tw * k > 0.45) glint(p, x, y, tw > 0.82 ? 2 : 1, C[6], 0.26 * k);
      return;
    }
    const c = u < 0.18 ? WHITE : u < 0.5 ? C[6] : C[4];
    p.dot(x, y, c, k * 1.5);
    if (spd > 20) p.dot(x, y + 1, u < 0.5 ? C[5] : C[3], k * 0.8);
    p.glow(x + 0.5, y + 0.5, 3, C[5], 0.15 * k);
  });
}
