import { fit } from "../../core/index.js";
import { palettes } from "./wand-core-flight.js";

export const meta = {
  name: "杖芯投射物 · 消散", desc: "光核散点、音符余波、冰晶碎片、电火花与暗星坍缩。",
  tags: ["projectile", "wand", "impact"], size: [32, 32], origin: [16, 16],
  duration: 5 / 24, loop: false, fps: 24, bg: "dark", options: { core: "blank" },
};

function blank(p, f, c) {
  const r = [2.5, 1.8, 1.1, 0.6, 0][f];
  if (r) p.ellipse(1, 0, r + 1, r, c[f === 0 ? 4 : 2]);
  const d = [2, 4, 5, 6, 7][f];
  p.line(d, -1, d + (f < 2 ? 2 : 0), -2, f < 4 ? c[2] : c[1]);
  p.px(-d, 1, c[1]);
  if (f < 3) p.line(-1, d - 1, 0, d, c[1]);
}

function note(p, f, c) {
  const d = [1, 3, 5, 6, 7][f];
  if (f < 2) p.sprite([".hh", "hwh", "gh."], { g: c[1], h: c[2], w: c[4] }, -2, 0);
  for (const side of [-1, 1]) {
    const x = side * d;
    const inset = Math.max(0, f - 2);
    p.polyline([[x, -3 + inset], [x + side, -2 + inset], [x + side, 1], [x, 2]], f < 2 ? c[2] : c[0]);
    if (f < 3) p.px(x - side, -4, c[3]);
  }
}

function ice(p, f, c) {
  const spread = [1, 2, 3.4, 4.5, 5.5][f];
  for (const [dx, dy] of [[1.5, -1], [-1, -1.2], [0.6, 1.2], [-1.6, 0.4]]) {
    const x = Math.round(dx * spread), y = Math.round(dy * spread);
    if (f < 3) p.tri(x - 1, y + 2, x + dx * 2, y + dy * 2, x + 1, y, c[0]);
    if (f < 4) p.line(x, y, x + dx, y + dy, f === 0 ? c[4] : c[1]);
    else p.px(x, y, c[0]);
  }
  if (f === 0) p.line(-2, 0, 3, -1, c[4]);
}

function lightning(p, f, c) {
  const r = [2, 4, 6, 7, 8][f];
  const spark = [c[4], c[4], c[1], c[1], c[0]][f];
  for (const [dx, dy] of [[1, -0.55], [-0.8, -0.8], [-0.4, 1], [1, 0.4]]) {
    const x = Math.round(dx * r), y = Math.round(dy * r);
    if (f < 3) p.polyline([[x - 2 * dx, y - 2 * dy], [x, y], [x - dx, y]], c[2]);
    p.px(x + dx, y + dy, spark);
  }
  if (f === 0) p.line(-3, 1, 3, -1, c[4]);
}

function dark(p, f, c) {
  const r = [6, 4.5, 3, 2, 1][f];
  if (f < 3) p.ellipse(0, 0, r * 0.7, r, c[0]);
  p.line(-r, r / 2, r, -r / 2, c[1]);
  p.line(0, 0, r - 1, -r / 2, f < 2 ? c[4] : c[2]);
  if (f < 3) {
    p.px(r + 1, r / 2, c[1]);
    p.px(-r - 1, -r / 2, c[1]);
  }
}

const drawCore = { blank, note, ice, lightning, dark };
export function draw(p, t, o) {
  const frame = Math.floor(t * meta.fps + 0.000001);
  if (frame < 5) drawCore[o.core](p, frame, fit(o.palette ?? palettes[o.core], 5));
}
