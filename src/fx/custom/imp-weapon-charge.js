import { clamp, ease, fit, TAU } from "../../core/index.js";

// 20 fps 导出时，依次为 9 帧入场、8 帧蓄满循环和 7 帧消散。
const gatherTime = 0.45;
const holdTime = 0.4;
const dieStart = 17 / 20;
const coreY = -1;
const dieSparks = [
  [-4, -1, -11, -3, 0.23],
  [-1, -4, -4, -12, 0.29],
  [2, -4, 8, -9, 0.26],
  [4, 0, 12, 2, 0.24],
  [1, 3, 4, 8, 0.18],
  [-3, 3, -9, 6, 0.19],
];

export const meta = {
  name: "Imp weapon charge",
  desc: "Three embers gather into a hot diamond at the staff tip, then break into cooling sparks.",
  tags: ["charge", "warning", "enemy", "fire", "weapon"],
  size: [28, 28],
  origin: [14, 14],
  duration: 1.2,
  loop: false,
  fps: 20,
  bg: "dark",
  options: {
    palette: ["#3e2731", "#a22633", "#e43b44", "#f77622", "#feae34", "#fee761"],
  },
};

export function draw(p, t, options) {
  const colors = fit(options.palette, 6);
  if (t >= dieStart) {
    drawDie(p, t - dieStart, colors);
    return;
  }

  const rise = ease.outQuad(clamp(t / gatherTime));
  const orbit = Math.max(0, t - gatherTime) / holdTime;
  const spin = rise * 0.8 + orbit * TAU;
  const distance = 10 - rise * 4;

  // 火星沿各自轨道向杖尖收拢，尾端留暗红短线。
  for (let i = 0; i < 3; i++) {
    const angle = -TAU / 4 + i * TAU / 3 + spin;
    const x = Math.cos(angle), y = Math.sin(angle);
    const breathe = 0.55 * Math.sin(orbit * TAU + i * TAU / 3);
    const reach = distance + (1 - rise) * (i - 1) + rise * breathe;
    const tipX = Math.round(x * reach);
    const tipY = coreY + Math.round(y * reach);
    const tailAngle = angle - 0.28 - (1 - rise) * 0.14;
    const tailX = Math.round(Math.cos(tailAngle) * (reach + 2));
    const tailY = coreY + Math.round(Math.sin(tailAngle) * (reach + 2));
    p.line(tailX, tailY, tipX, tipY, colors[1]);
    p.px(tailX, tailY, colors[0]);
    p.px(tipX, tipY, colors[i === 0 ? 4 : 3]);
    if (i === 0 && rise > 0.55) p.px(Math.round(x * (reach - 1)), coreY + Math.round(y * (reach - 1)), colors[3]);
  }

  // 核心逐格扩大，左上角偏亮，保留与背景相隔的深红轮廓。
  const radius = 1 + Math.floor(rise * 3);
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const edge = Math.abs(x) + Math.abs(y);
      if (edge > radius) continue;

      const color = edge === radius ? colors[1]
        : edge >= radius - 1 ? colors[x + y < 0 ? 3 : 2] : colors[4];
      p.px(x, coreY + y, color);
    }
  }

  p.px(0, coreY, radius >= 3 ? colors[5] : colors[4]);
  if (radius >= 3) p.px(-1, coreY - 1, colors[5]);
  if (radius === 4) {
    const pulse = Math.cos(orbit * TAU);
    p.px(0, coreY - radius, colors[pulse > 0 ? 4 : 3]);
    p.px(-radius, coreY, colors[3]);
    p.px(0, coreY + radius, colors[2]);
  }
}

function drawDie(p, t, colors) {
  // 火核缩成一点，散开的火星由亮橙冷却成暗红。
  if (t < 0.15) {
    const radius = Math.ceil(3 * (1 - t / 0.15));
    for (let y = -radius; y <= radius; y++) {
      const halfWidth = radius - Math.abs(y);
      p.line(-halfWidth, coreY + y, halfWidth, coreY + y, colors[2]);
      if (halfWidth > 0) p.line(1 - halfWidth, coreY + y, halfWidth - 1, coreY + y, colors[radius + 1]);
    }
    p.px(0, coreY, colors[radius + 2]);
    if (radius === 3) p.px(-1, coreY - 1, colors[4]);
  }

  for (const [startX, startY, endX, endY, lifetime] of dieSparks) {
    const age = t / lifetime;
    if (age >= 1) continue;
    const travel = ease.outCubic(age);
    const tail = ease.outCubic(Math.max(0, age - 0.17));
    const x = Math.round(startX + (endX - startX) * travel);
    const y = coreY + Math.round(startY + (endY - startY) * travel);
    const tailX = Math.round(startX + (endX - startX) * tail);
    const tailY = coreY + Math.round(startY + (endY - startY) * tail);
    p.line(tailX, tailY, x, y, colors[age < 0.6 ? 1 : 0]);
    p.px(x, y, colors[age < 0.4 ? 4 : age < 0.68 ? 3 : 1]);
  }
}
