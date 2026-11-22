import { fit, TAU } from "../../core/index.js";

// 顺序为暗面、背光面、主色、亮面和高光，取自项目 WorldUI 色盘。
export const palettes = {
  blank: ["#9F8D74", "#C7BDA9", "#E8DCC5", "#E8DCC5", "#FFFFFF"],
  note: ["#9F8D74", "#F0C060", "#F3D184", "#E8DCC5", "#FFFFFF"],
  ice: ["#7BA8DD", "#4AE3FF", "#9EEBFF", "#9EEBFF", "#FFFFFF"],
  lightning: ["#F0C060", "#FFD140", "#FFE84A", "#F3D184", "#FFFFFF"],
  dark: ["#1B1411", "#C77DFF", "#7BA8DD", "#E8DCC5", "#FFFFFF"],
};

const fps = 24;
const framesPerLoop = 12;
export const meta = {
  name: "杖芯投射物 · 飞行", desc: "双股以太、和弦回响、翻转的冰晶、分岔电弧和引力旋臂。",
  tags: ["wand", "projectile", "loop"], size: [32, 32], origin: [16, 16],
  duration: framesPerLoop / fps, loop: true, fps, bg: "dark",
  options: { core: "blank" },
};

// 以太弹的两缕尾流交替绕到前面。亮核始终落在同一个发射轴上。
function blank(p, phase, c) {
  for (const offset of [0, Math.PI]) {
    const points = [];
    for (let x = -12; x <= 0; x++) {
      const width = 3.4 * ((x + 14) / 14);
      points.push([x, Math.round(width * Math.sin(phase + offset + (x + 7) * 0.42))]);
    }
    p.polyline(points.slice(1, 10), offset === 0 ? c[1] : c[0]);
    p.polyline(points.slice(6), offset === 0 ? c[2] : c[1]);
  }
  const pulse = (1 - Math.cos(phase)) / 2;
  p.ellipse(0, 0, 4.6 + pulse, 3.1 + 0.8 * pulse, c[1]);
  p.ellipse(1, -0.6, 4.4, 2.8 + 0.8 * pulse, c[2]);
  p.ellipse(2.6, -1.1, 1.7 + pulse, 1.2 + pulse * 0.7, c[4]);
  p.line(-5, 1, -2, 1, c[2]);
  p.px(-12, Math.round(2.5 * Math.cos(phase)), c[0]);
}

// 两枚错开的符头共用符梁，亮点沿梁移动；后方短弧是上一拍的余音。
function note(p, phase, c) {
  // 前后符头稍微错拍，符梁、高光和余音依次到达最高点。
  const lift = 1.35 * Math.sin(phase);
  const lean = 1.25 * Math.cos(phase + 0.18);
  const rearY = 4.25 + lift, frontY = 2.25 - 1.15 * Math.sin(phase - 0.62);
  const left = -4 + lean, right = 5 + lean;
  const beam = -4.9 - 1.05 * Math.sin(phase + 0.42);
  const echo = -10.4 - 1.55 * Math.sin(phase - 0.8);
  const echoY = 2.5 + Math.sin(phase - 1.1);
  p.polyline([[echo + 1, echoY - 1], [echo, echoY], [echo, echoY + 2], [echo + 1, echoY + 3]], c[0]);
  p.line(-5, rearY, left, beam + 2, c[1]);
  p.line(-4, rearY, left + 1, beam + 2, c[2]);
  p.line(4, frontY, right, beam - 1, c[2]);
  p.line(5, frontY, right + 1, beam - 1, c[3]);
  p.poly([[left, beam + 1], [right + 1, beam - 2], [right + 1, beam + 1], [left, beam + 4]], c[2]);
  const glint = 0.5 + 3.1 * Math.sin(phase - 0.34);
  const glintY = beam + 1.9 - 0.3 * (glint - left);
  p.line(glint - 1, glintY + 0.4, glint + 1.3, glintY - 0.4, c[4]);
  p.ellipse(-6, rearY, 2.8, 2.1, c[1]);
  p.line(-7, rearY - 1, -5, rearY - 1, c[2]);
  p.ellipse(3, frontY, 2.9, 2.1, c[2]);
  p.line(2, frontY - 1, 4, frontY - 1, c[4]);
}

// 固定尖端与后端，变换中间三处棱线的投影，得到沿弹道轴滚转的晶面。
function ice(p, phase, c) {
  const top = -3.6 - Math.cos(phase) * 1.1;
  const bottom = 3.5 - Math.cos(phase) * 0.8;
  const ridge = Math.sin(phase) * 2.2;
  const rear = [-7, 0], tip = [12, -0.5];
  p.poly([rear, [-3, top], [1, top + 0.2], tip, [0, bottom], [-4, bottom - 0.5]], c[0]);
  p.poly([rear, [-3, top], [0, top], tip, [-1, ridge]], c[2]);
  p.poly([rear, [-1, ridge], tip, [0, bottom], [-3, bottom - 0.6]], c[1]);
  p.tri(-7, 0, -3, top, -1, ridge, c[0]);
  const glint = -1 + 3 * Math.sin(phase);
  p.line(glint, ridge - 1, glint + 3, ridge - 1, c[4]);
  p.line(0, bottom - 1, 5, 1.5, c[0]);
  for (const shift of [0, Math.PI]) {
    const a = phase + shift;
    const x = -9 + Math.cos(a) * 2.7, y = Math.sin(a) * 4.7;
    p.poly([[x - 3, y], [x - 0.6, y - 1], [x + 2, y], [x - 1.5, y + 1.5]], c[0]);
    p.line(x - 1, y, x + 1, y - 0.5, Math.sin(a) < 0 ? c[2] : c[1]);
  }
}

function lightning(p, phase, c) {
  const wave = Math.sin(phase), cross = Math.cos(phase);
  const a = -3.6 + 1.5 * wave, b = 3.0 + 1.7 * cross;
  const trunk = [[-13, 2 * cross], [-10, 2 * cross], [-6, a], [-4, b], [0, -1], [3, -3 + wave], [4, 0], [10, -1]];
  p.polyline(trunk.map(([x, y]) => [x, y + 1]), c[1]);
  p.polyline(trunk, c[2]);
  p.polyline(trunk.slice(2, 7).map(([x, y]) => [x + 1, y]), c[2]);
  p.polyline([[-4, b], [-1, 0], [2, -2 + wave]], c[4]);
  // 支路换向前先从末端缩回主干，下一帧再往另一侧击出。
  const fork = -Math.sin(phase - 0.3);
  const reach = Math.min(1, Math.abs(fork) * 1.9);
  p.polyline([[-6, a], [-6 - 3 * reach, a + 3 * fork], [-6 - 7 * reach, a + 5 * fork]], c[0]);
  // 靠前的小电结在蓄亮时横向拉长，分叉支路只占一侧。
  const hot = 0.5 + 0.5 * Math.cos(phase);
  p.poly([[3, 0], [7, -1.5 - hot], [12, -1], [8, 0.5], [6, 2 + hot]], c[2]);
  p.line(5, 0, 8 + 2 * hot, -1, c[4]);
  if (hot > 0.55) p.line(7, -2, 8, -3.5, c[3]);
}

// 两条开放的旋臂半圈内收。近侧露出亮面，远侧沉到固定的四芒星核之后。
function dark(p, phase, c) {
  for (let arm = 0; arm < 2; arm++) {
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12, angle = phase + arm * Math.PI + u * 2.2;
      const r = (arm === 0 ? 8.5 : 7.3) * (1 - u) + 2.3 * u;
      points.push([r * Math.cos(angle), r * 0.75 * Math.sin(angle)]);
    }
    p.polyline(points, c[1]);
    p.polyline(points.slice(4, 11).map(([x, y]) => [x, y + 1]), arm === 0 ? c[1] : c[0]);
    p.polyline(points.slice(2, 5), arm === 0 ? c[3] : c[2]);
  }
  const breathe = 0.5 + 0.5 * Math.cos(phase);
  const radius = 5.0 + breathe;
  p.poly([[0, -radius - 1], [2, -2], [radius, 0], [2, 2],
    [0, radius + 1], [-2, 2], [-radius, 0], [-2, -2]], c[1]);
  p.poly([[0, -2], [2, 0], [4, 0], [1, 2], [0, 4], [-1, 1]], c[0]);
  p.line(-3, -1, -1, -3, c[2]);
  p.px(-1, -2, c[3]);
  if (breathe > 0.55) p.px(-1, -3, c[4]);
}

const drawCore = { blank, note, ice, lightning, dark };
export function draw(p, t, o) {
  // 整数帧号让每次循环在相同像素上取样，避免棱线落在格边时来回跳动。
  const frame = Math.floor(t * fps + 1e-7) % framesPerLoop;
  const phase = frame * TAU / framesPerLoop;
  drawCore[o.core](p, phase, fit(o.palette ?? palettes[o.core], 5));
}
