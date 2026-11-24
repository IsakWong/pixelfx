import { Rng, clamp, ease, fit, lerp } from "../../core/index.js";

const A0 = Math.PI * -0.34;
const A1 = Math.PI * 0.34;
const REACH = 26;

export const meta = {
  name: "弧形挥击",
  desc: "横向弧形刀光扫过身前扇面，末端甩出几粒余火。",
  tags: ["melee", "fire"],
  size: [56, 56],
  origin: [8, 28],
  duration: 0.34,
  fps: 30,
  loop: false,
  bg: "ground",
  options: { palette: ["#3a1f36", "#8c2f3e", "#d65039", "#ff8c51", "#ffc688", "#fff4d8"], seed: 21 },
};

export function draw(p, t, o) {
  const c = fit(o.palette, 6);

  // 刃头先快后慢扫出，刀尾晚一拍跟上。
  const headT = ease.outCubic(clamp(t / 0.12));
  const head = lerp(A0, A1, headT);
  const tailT = ease.inQuad(clamp((t - 0.03) / 0.22));
  const tail = lerp(A0, A1 - 0.04, tailT);
  const edge = 1 - clamp((t - 0.15) / 0.18);

  if (edge > 0 && head > tail + 0.001) {
    // 内侧一圈暗边 → 橙色主体 → 前缘亮白；层数少，避免像素边界互相穿插。
    p.arc(0, 0, REACH - 3, 1, tail, head, c[2], edge);
    p.arc(0, 0, REACH, u => (2 + 5 * u) * edge, tail, head, c[3], edge);
    p.arc(0, 0, REACH, 1, lerp(tail, head, 0.5), head, c[5], edge);
    p.glow(Math.cos(head) * REACH, Math.sin(head) * REACH, 9, c[4], 0.6 * edge);
  }

  // 沿弧线甩出的火星。
  const rng = new Rng(o.seed);
  for (let i = 0; i < 10; i++) {
    const along = (i + rng.range(0, 0.7)) / 10;
    const angle = lerp(A0, A1, along);
    const age = t - along * 0.1;
    const life = rng.range(0.12, 0.22);
    if (age < 0 || age >= life) continue;

    const radius = REACH - 1 + age * rng.range(24, 40);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius - age * 9;
    const fade = 1 - age / life;
    p.line(x - Math.cos(angle) * 3, y - Math.sin(angle) * 3, x, y, c[2], fade);
    p.dot(x, y, fade > 0.6 ? c[5] : c[4], fade);
  }
}
