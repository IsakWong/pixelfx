// 门边火把的低亮暖色光晕，仅表现泛光，不照亮场景地面。
import { fit, TAU } from "../../core/index.js";
export const meta = {
  name: "门边火把泛光",
  desc: "A small, low-opacity warm halo for the doorway torches.",
  tags: ["door", "torch", "glow", "loop", "custom"],
  size: [32, 32], origin: [16, 16], duration: 3.2, loop: true, fps: 30, bg: "dark",
  options: { palette: ["#f4c762"], seed: 17 },
};
export function draw(p, t, o) {
  const C = fit(o.palette, 1);
  const strength = 0.16 + Math.sin(t / meta.duration * TAU) * 0.01;
  p.disc(0, 0, 11, C[0], d => (1 - d) ** 2 * strength);
}
