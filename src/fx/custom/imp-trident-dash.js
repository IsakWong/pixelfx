import { Rng, fit } from "../../core/index.js";

export const meta = {
  name: "小恶魔突进余火",
  desc: "突进时脚边擦出向后散开的火星。",
  tags: ["dash", "fire", "ground"],
  size: [34, 24],
  origin: [27, 12],
  duration: 0.27,
  fps: 30,
  loop: false,
  bg: "ground",
  options: { palette: ["#502737", "#9b3b3b", "#e46040", "#ff9a5c", "#ffdf9f"], seed: 31 },
};

export function draw(p, t, o) {
  const c = fit(o.palette, 5);
  const rng = new Rng(o.seed);
  for (let i = 0; i < 9; i++) {
    const x0 = rng.range(-5, 2);
    const y0 = rng.range(-4, 4);
    const speed = rng.range(36, 74);
    const drift = rng.range(-22, 22);
    const delay = rng.range(0, 0.043);
    const life = rng.range(0.10, 0.21);
    const age = t - (i < 3 ? 0 : delay);
    if (age < 0 || age >= life) continue;

    const fade = 1 - age / life;
    const x = x0 - speed * age;
    const y = y0 + drift * age;
    const length = (1 + speed * 0.05) * fade;
    p.line(x - length, y + drift * 0.025, x, y, c[1], fade);
    p.dot(x, y, fade > 0.6 ? c[4] : c[2], fade);
    if (i % 3 === 0) p.glow(x, y, 4, c[3], 0.25 * fade);
  }
}
