// 通用燃烧元素：一根自包含的循环火苗，透明底、底部中心对齐，供 Unity 粒子系统的 Texture Sheet
// Animation 直接播放（也可作为挂点火焰、火堆、燃烧状态的基础元素）。不依赖角色像素，不含火星/烟，
// 这些交给粒子系统自己叠。宽底、尖顶、中心白热、外缘暗红，火舌与亮度都按 D 秒无缝循环。
import { fit, clamp, loopNoise, rand, TAU } from "../../core/index.js";

export const meta = {
  name: "Burning element",
  desc: "A single looping flame element on a transparent background, bottom-center aligned: a wide base, a licking tip, white-hot core and dark red rim, for Unity particle sheets.",
  tags: ["custom", "fire", "burn", "flame", "element", "particle", "loop"],
  size: [16, 24],
  origin: [8, 23],
  duration: 0.8,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff8d6"],
    seed: 3,
    height: 21,
    width: 6.6,
  },
};

const D = meta.duration;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), ph = t / D, n = C.length;
  const H = o.height, W = o.width;
  const wob = loopNoise(ph, 1.1, o.seed), wob2 = loopNoise(ph * 2, 1.4, o.seed + 7);

  for (let y = 0; y >= -Math.ceil(H); y--) {
    const u = clamp(-y / H, 0, 1);
    // 基部最宽，向上收尖；越靠上摆幅越大，读作火舌在舔
    const shape = W * Math.pow(1 - u, 0.58) * (1 - 0.12 * u);
    if (shape < 0.35) continue;
    const sway = Math.sin(ph * TAU + u * 2.6) * (0.3 + 1.9 * u) + wob * 0.5 * u;
    const n1 = loopNoise(ph + u * 0.17, 1.3, o.seed + 11);
    const half = shape * (1 + 0.16 * n1) + 0.3;
    const cx = sway;

    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      if (x < -7 || x > 7) continue;
      const dx = (x + 0.5 - cx) / Math.max(0.6, half);
      if (Math.abs(dx) > 1) continue;

      // 中心最热、基部次热、边缘和尖端最冷；叠一点像素噪声避免光滑渐变
      const core = 1 - Math.abs(dx);
      let heat = core * 0.72 + (1 - u) * 0.32 + wob2 * 0.05;
      heat -= Math.pow(u, 2.4) * 0.28;
      heat += (rand(x, y, o.seed) - 0.5) * 0.12;
      if (Math.abs(dx) > 0.82) {
        // 外缘压成暗红描边，叠在深色地面上轮廓才清楚
        p.px(x, y, u > 0.82 ? C[1] : C[2]);
        continue;
      }
      const idx = clamp(Math.floor(heat * (n - 1)), 0, n - 1);
      p.px(x, y, C[idx]);
    }
  }

  // 基部的一点上射光，把火苗"点着"；保持克制，导出的序列帧叠在粒子上不会糊
  p.glow(0, -2, 7, C[4], 0.22);
  p.glow(0, -1, 3, C[6], 0.18);
}
