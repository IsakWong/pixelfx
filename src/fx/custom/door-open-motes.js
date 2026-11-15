// 门洞开启微光：六粒暖金光点缓慢上浮，淡紫光晕贴着门槛；使用图书馆子盘。
import { fit, TAU } from "../../core/index.js";

export const meta = {
  name: "门洞开启微光",
  desc: "Sparse gold motes drifting upward inside an open doorway, with a restrained violet threshold glow.",
  tags: ["door", "ambient", "motes", "loop", "custom"],
  size: [40, 48], origin: [20, 39], duration: 3.2, loop: true, fps: 30, bg: "dark",
  options: { palette: ["#4f4d60", "#9f81c5", "#e8b25a", "#f0e0b8"], seed: 17 },
};

export function draw(p, t, o) {
  const C = fit(o.palette, 4);
  const breath = 0.5 + 0.5 * Math.sin(t / meta.duration * TAU);
  p.disc(0, -7, 10, C[1], d => (1 - d) ** 2 * (0.08 + breath * 0.04));
  for (let i = 0; i < 6; i++) {
    const u = (t / meta.duration + i / 6) % 1;
    const fade = Math.min(1, u / 0.16, (1 - u) / 0.22);
    const x = [-8, 4, -3, 9, -6, 1][i] + Math.sin(u * TAU + i + o.seed) * 1.2;
    const y = -2 - u * (24 + i % 3 * 2);
    p.disc(x, y, 2.3, C[2], d => (1 - d) ** 2 * 0.18 * fade);
    p.blend(x, y, u < 0.55 ? C[2] : C[3], 0.8 * fade);
    // 两粒光点偶尔短暂闪成小十字，其余仍保持单像素，避免整扇门闪烁。
    if ((i === 1 || i === 4) && u > 0.4 && u < 0.52) {
      const wink = Math.sin((u - 0.4) / 0.12 * Math.PI) * 0.3;
      p.blend(x - 1, y, C[2], wink);
      p.blend(x + 1, y, C[2], wink);
      p.blend(x, y - 1, C[2], wink);
      p.blend(x, y + 1, C[2], wink);
    }
  }
}
