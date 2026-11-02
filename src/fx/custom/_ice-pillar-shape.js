// 冰柱轮廓：下半身冰冻特效与它的破碎共用同一套形状，保证碎块对得上冰体。
// 坐标以脚底 (0, 0) 为原点，向上为负；H 是柱高，HW 是贴地半宽。
import { clamp } from "../../core/index.js";

export const H = 34;
export const HW = 17;

/** 某一高度处的半宽：底部微微外扩（结霜的底座），中段收紧，顶端收成尖。 */
export function halfAt(y) {
  const u = clamp(-y / H, 0, 1);
  return (HW * Math.pow(1 - u, 0.62) + 0.9) * (1 + 0.08 * Math.exp(-u * 12));
}
