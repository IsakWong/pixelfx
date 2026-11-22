import { ease, fit, rng, star, TAU } from "../../core/index.js";

export const meta = {
  name: "属性追击命中",
  desc: "追击弹落点瞬间闪白，淡金光环向外炸开，碎光在 0.35 秒内消散。",
  tags: ["custom", "impact", "explosion", "element-proc", "one-shot"],
  size: [32, 32],
  origin: [16, 16],
  duration: 0.35,
  loop: false,
  fps: 60,
  bg: "dark",
  options: {
    palette: ["#b86f50", "#e4a672", "#feae34", "#ead4aa", "#fee761", "#ffffff"],
    seed: 19,
  },
};

export function draw(p, t, o) {
  const [ember, peach, gold, cream, paleGold, white] = fit(o.palette, 6);

  // 命中当帧亮起，白芯比外层更早收缩。
  const coreAge = t / 0.1;
  if (coreAge < 1) {
    const radius = 5 + 3.1 * ease.outCubic(coreAge);
    const hollow = radius * Math.max(0, (coreAge - 0.18) / 0.82);
    p.shade(-10, -10, 10, 10, (x, y) => {
      const angle = Math.atan2(y, x);
      const edge = radius * (0.84 + 0.13 * Math.cos(angle * 5 + 0.3) + 0.1 * Math.sin(angle * 7));
      const distance = Math.hypot(x, y);
      if (distance < hollow || distance > edge) return;
      if (coreAge > 0.52 && Math.cos(angle * 4 - 0.6) < coreAge - 1.1) return;

      if (coreAge < 0.52 && distance < edge * 0.58) return paleGold;
      if (distance < edge * 0.8) return cream;
      return coreAge < 0.52 ? gold : peach;
    });

    const hot = 1 - t / 0.05;
    if (hot > 0) {
      p.poly(star(0, 0, 2.2 * hot, 5.5 * hot, 4, 0.29), white);
    }
  }

  // 环面略压扁，扩到外缘时碎成几段。
  const ringAge = (t - 0.018) / 0.17;
  if (ringAge >= 0 && ringAge < 1) {
    const radius = 4 + 8.7 * ease.outCubic(ringAge);
    const thickness = 1.45 - 0.95 * ringAge;
    p.shade(-14, -12, 14, 12, (x, y, pixel) => {
      const liftedY = y / 0.78;
      if (Math.abs(Math.hypot(x, liftedY) - radius) > thickness * 0.5) return;

      const angle = Math.atan2(liftedY, x);
      const cracks = Math.sin(angle * 4 + 0.7) + 0.25 * Math.sin(angle * 7 - 0.4);
      if (cracks < ringAge * 1.1 - 0.83) return;

      pixel.c = ringAge < 0.4 ? paleGold : ringAge < 0.68 ? cream : peach;
      pixel.a = 1 - ringAge * ringAge;
    });
  }

  // 碎光不等速飞出，明亮的短尾先消失，颗粒再冷却。
  for (let i = 0; i < 12; i++) {
    const random = rng(o.seed, i, 1);
    const age = (t - random.range(0.008, 0.045)) / random.range(0.12, 0.274);
    if (age < 0 || age >= 1) continue;

    const angle = (i + random.range(-0.36, 0.36)) * TAU / 12;
    const distance = 3 + random.range(4.5, 11.5) * ease.outCubic(age);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle) * 0.83;
    const x = dx * distance;
    const y = dy * distance + age;

    if (i % 3 === 0 && age < 0.48) {
      const tail = 2.9 * (1 - age);
      p.line(x - dx * tail, y - dy * tail, x, y, age < 0.22 ? gold : peach);
    }

    const color = age < 0.26 ? cream : age < 0.62 ? paleGold : age < 0.85 ? peach : ember;
    p.px(x, y, color);
    if (i % 5 === 0 && age < 0.52) p.px(x - dy, y + dx, gold);
  }
}
