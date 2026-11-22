import { ease, fit, lerp, rng, seg, star } from "../../core/index.js";

const groundTime = 1.2;
const releaseTime = 0.88;
const chargeY = -53;

export const meta = {
  name: "区域压制落光",
  desc: "暗红碎光从高处汇成逐渐发亮的光核，压紧后坠向锁定点。",
  tags: ["custom", "enemy", "warning", "beam", "one-shot"],
  size: [36, 88],
  origin: [18, 77],
  duration: 1.21, // 保留 30 fps 采样的最后一帧红光，由落点结算接入爆炸。
  loop: false,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#3e2731", "#a22633", "#e43b44", "#f77622", "#fee761"],
    seed: 29,
  },
};

export function draw(p, t, options) {
  if (t >= meta.duration) return;

  const colors = fit(options.palette, 5);
  if (t < releaseTime) {
    drawCharge(p, t, colors, options.seed);
    return;
  }
  drawFall(p, seg(t, releaseTime, groundTime), colors);
}

function drawCharge(p, t, colors, seed) {
  const energy = ease.inOutQuad(seg(t, 0, 0.72));
  const squeeze = ease.inCubic(seg(t, 0.63, releaseTime));
  for (let i = 0; i < 22; i++) {
    const spark = rng(seed, i);
    const birth = lerp(-0.16, 0.69, ease.outQuad(i / 21)) + spark.range(-0.018, 0.018);
    const arrival = Math.min(releaseTime - 0.01, birth + spark.range(0.20, 0.31));
    const age = (t - birth) / (arrival - birth);
    if (age < 0 || age >= 1) continue;

    // 碎光越靠近光核，拖尾越长，汇入后消失。
    const x = spark.sign() * spark.range(8, 15);
    const y = spark.range(-22, 5);
    const distance = 1 - ease.inQuad(age);
    const trail = 1 - ease.inQuad(Math.max(0, age - 0.22));
    p.line(x * trail, chargeY + y * trail, x * distance, chargeY + y * distance, colors[1]);
    p.px(x * distance, chargeY + y * distance, colors[age > 0.26 ? 2 : 1]);
  }

  const radius = lerp(1.1, 5.4, energy);
  const width = radius * (1 - 0.59 * squeeze);
  const height = radius * (0.83 + 0.19 * squeeze);
  const y = chargeY + 2 * squeeze;
  p.glow(0, y, 4 + width * 1.65, colors[2], 0.14 + 0.42 * energy + 0.25 * squeeze);
  p.poly(star(0, y, width * 0.42, width, 4, -0.3 + 0.4 * energy), colors[1]);
  p.ellipse(0, y, width * 0.7, height, colors[2]);
  if (energy > 0.26) p.ellipse(0, y, width * 0.34, height * 0.61, colors[3]);
  if (squeeze > 0.28) p.line(0, y - 2, 0, y + 2, colors[4]);
}

function drawFall(p, progress, colors) {
  const drop = 0.32 * progress + 0.68 * ease.inQuad(progress);
  const tip = lerp(chargeY + 5, -1, drop);
  const tail = tip - lerp(9, 29, ease.outQuad(progress));
  const width = lerp(3.4, 2.1, progress);
  if (progress < 0.9) {
    const offset = lerp(5.5, 1, progress);
    const end = lerp(tail, tip, 0.63);
    p.line(-offset, tail + 1, -offset, end, colors[1]);
    p.line(offset, tail + 4, offset, end + 1, colors[0]);
  }
  p.glowLine(0, tail + 4, 0, tip - 1, 5, colors[2], 0.46);
  p.poly([[0, tail], [width, tip - 5], [1, tip - 1], [0, tip],
          [-1.5, tip - 2], [-width, tip - 6]], colors[1]);
  p.poly([[0, tail + 4], [width - 1, tip - 5], [0, tip],
          [1 - width, tip - 5]], colors[2]);
  p.line(0, lerp(tail, tip, 0.52), 0, tip - 1, colors[3]);
  p.line(0, tip - 3, 0, tip, colors[4]);
}
