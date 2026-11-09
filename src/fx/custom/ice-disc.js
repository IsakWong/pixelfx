// Ice variant of the energy disc, for JASA's spinning ice dart. A sawblade of ice lying in the ground plane:
// the 3/4 top-down camera squashes it into an ellipse (SY), and its thickness shows as a dark rim under the
// near edge. The blade turns on its own; hooked white-edged teeth, spiral frost arms, a pale hub, sparks
// flung off the teeth, frost motes and glints all stay inside the disc's plane.
import { fit, clamp, rng, fly, TAU, WHITE, PAL } from "../../core/index.js";
import { beat, spark } from "../projectiles/_lib.js";

export const meta = {
  name: "Ice disc",
  desc: "A spinning ice sawblade lying in the ground plane, foreshortened to an ellipse: hooked white-edged teeth, spiral frost arms, a pale hub, a dark thickness rim and sparks.",
  tags: ["projectile", "ice", "disc", "saw", "energy", "directional", "loop", "custom", "3/4"],
  size: [36, 36],
  origin: [18, 18],
  duration: 0.5,
  loop: true,
  fps: 30,
  bg: "sky",
  options: { palette: PAL.ice, size: 8, teeth: 8, seed: 5 },
};

const SY = 0.62; // 3/4 俯视：圆盘的垂直半径压缩到 62%
const TH = 3.2;  // 盘缘厚度（屏幕上向下露出的像素）
const inside = (x, y) => x > -17 && x < 17 && y > -17 && y < 17;

export function draw(p, t, o) {
  const C = fit(o.palette, 8), R = o.size, N = o.teeth, S = o.seed, D = meta.duration;
  const rot = (TAU * 3 * t) / D, seg = TAU / N, frac = (x) => x - Math.floor(x);
  const f = Math.floor(t * 30 + 1e-6), fr = rng(S, 17, f);
  const SP = [WHITE, C[6], C[5], C[4]];

  // 齿尖甩出的火星：沿椭圆切线方向，纵向速度同样压扁
  beat(t, D, 16, S + 3, (r) => r.range(0.1, 0.24), (age, life, r) => {
    const a = rot + r.range(0, TAU), tip = R + 3.5, v = r.range(60, 150);
    const vx = -Math.sin(a) * v, vy = Math.cos(a) * v * SY;
    const [x, y] = fly(Math.cos(a) * tip, Math.sin(a) * tip * SY, vx, vy, age, 40 * SY, 2.4);
    if (!inside(x, y)) return;
    spark(p, x, y, vx, vy, 1 - age / life, SP, 0.35, 0.02, 6);
  });

  // 盘缘抖落的霜屑：向外飘，纵向压扁
  beat(t, D, 10, S + 7, (r) => r.range(0.1, 0.2), (age, life, r) => {
    const a = rot + r.range(0, TAU), d0 = R + 1.5, k = 1 - age / life;
    const [x, y] = fly(Math.cos(a) * d0, Math.sin(a) * d0 * SY, Math.cos(a) * 14, Math.sin(a) * 14 * SY, age, 0, 1.2);
    if (!inside(x, y)) return;
    p.line(x, y, x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5 * SY, k > 0.5 ? C[5] : C[4], k);
  });

  // 厚度：整块盘向下错开一点先画一遍暗色，盘面盖上去后只在近侧留出月牙形的侧壁
  p.shade(-R - 6, -R * SY - 2, R + 6, R * SY + TH + 3, (x, y) => {
    const dy = y - TH, r = Math.hypot(x, dy / SY), th = Math.atan2(dy / SY, x);
    if (r > R + 5.5) return;
    const ph = frac((th - rot) / seg), tooth = 4.2 * Math.pow(ph, 1.4);
    if (!(r <= R || r - R < tooth)) return;
    const lit = clamp(0.55 - (x * 0.45 + dy * 0.3) / R, 0, 1);
    return lit > 0.6 ? C[3] : lit > 0.3 ? C[2] : C[1];
  });

  // 盘面：椭圆内的锯片，左上受光
  p.shade(-R - 6, -R * SY - 5, R + 6, R * SY + 5, (x, y) => {
    const v = y / SY, r = Math.hypot(x, v), th = Math.atan2(v, x);
    if (r > R + 5.5) return;
    const lit = clamp(0.55 - (x * 0.35 + v * 0.3) / R, 0, 1);
    const lift = lit > 0.66 ? 1 : lit < 0.26 ? -1 : 0;

    if (r <= R) {
      if (r < 1.6) return WHITE;
      if (r < 2.6) return C[1];
      if (r > R - 1.2) return lit > 0.45 ? C[6] : C[5];
      const arm = Math.sin(3 * (th - rot * 0.5) - r * 0.85);
      const base = arm > 0.75 ? 5 : arm > 0.35 ? 4 : arm > -0.2 ? 3 : 2;
      return C[clamp(base + lift, 0, 6)];
    }
    const ph = frac((th - rot) / seg), tooth = 4.2 * Math.pow(ph, 1.4);
    if (r - R < tooth) return ph > 0.86 ? WHITE : C[clamp((ph > 0.6 ? 6 : ph > 0.35 ? 5 : 3) + lift, 0, 7)];
    if (r - R < 1.6) return C[2];
    return undefined;
  });

  // 随盘面一起转的切割高光
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * TAU) / 4 + 0.3;
    for (let d = 3; d < R - 1; d += 0.5) p.px(Math.cos(a) * d, Math.sin(a) * d * SY, C[5]);
  }
  // 椭圆盘缘的高光：左上更亮
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU, lit = 0.5 + 0.5 * Math.cos(a + Math.PI * 0.75);
    p.px(Math.cos(a) * (R + 0.5), Math.sin(a) * (R + 0.5) * SY, lit > 0.55 ? WHITE : C[6]);
  }

  // 沿盘缘奔跑的反光，冷色光
  for (let i = 0; i < 2; i++) {
    const a = rot + i * Math.PI + fr.range(-0.15, 0.15), gx = Math.cos(a) * (R + 1), gy = Math.sin(a) * (R + 1) * SY;
    p.px(gx, gy, WHITE);
    p.glow(gx, gy, 3, C[5], 0.3);
  }
  p.glow(0, 0, 14, C[3], 0.3);
  p.glow(0, 0, 5, C[5], 0.2);
}
