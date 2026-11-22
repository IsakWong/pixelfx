import { fit, TAU } from "../../core/index.js";

export const meta = {
  name: "敌人弹幕 · 红色圆弹",
  desc: "固定的朱红圆芯，两道长短不同的弧光沿弹芯转动。",
  tags: ["enemy", "barrage", "projectile", "orb", "idle", "loop"],
  size: [16, 16], origin: [8, 8], duration: 0.5, loop: true, fps: 24, bg: "dark",
  options: { palette: ["#A22633", "#E43B44", "#F6757A", "#EAD4AA"] },
};

// 沿用普通弹原本的 8×8 圆形轮廓，左上沿受光，最亮的像素留给转动的弧尖。
const core = [
  "..ssrr..",
  ".srhhrr.",
  "srhrrrrs",
  "srrrrrrs",
  "srrrrrrs",
  "srrrrrss",
  ".srrrss.",
  "..ssss..",
];

export function draw(p, t, o) {
  const [shade, red, rose, glint] = fit(o.palette, 4);
  const steps = meta.fps * meta.duration;
  const frame = Math.floor(t * meta.fps + 1e-6) % steps;
  const angle = frame * TAU / steps - 0.35;
  p.sprite(core, { s: shade, r: red, h: rose }, -4, -4);
  // 弧尖和尾迹走同一条像素轨迹，转过斜角时也连成一笔。
  const radius = 5.8;
  const point = a => [radius * Math.cos(a), radius * Math.sin(a)];
  const lead = Array.from({ length: 7 }, (_, i) => point(angle - (6 - i) * 0.18));
  p.polyline(lead, red);
  p.polyline(lead.slice(-3), rose);
  p.px(...lead[6], glint);
  const echo = Array.from({ length: 4 }, (_, i) => point(angle + Math.PI - (3 - i) * 0.18));
  p.polyline(echo, shade);
}
