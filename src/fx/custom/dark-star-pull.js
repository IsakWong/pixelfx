import { cycle, fit, TAU } from "../../core/index.js";

export const meta = {
  name: "暗星黑洞牵引",
  desc: "贴地的暗紫圆环标记牵引边界，亮紫像素流一束束卷向黑洞中心。",
  tags: ["dark", "black-hole", "gravity", "vortex", "loop", "custom"],
  size: [132, 132],
  origin: [66, 66],
  duration: 1.6,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#160b29", "#382056", "#613792", "#9a5cdc", "#c293f7", "#efd6ff"],
    seed: 17,
  },
};

// 16 PPU 下，64 px 对应暗星默认牵引半径 4。
const RADIUS = 64;

function drawField(p, colors, turn) {
  p.each(-RADIUS, -RADIUS, RADIUS, RADIUS, (x, y, sx, sy) => {
    const distance = Math.sqrt(x * x + y * y);
    if (distance > RADIUS) return;

    const depth = RADIUS - distance;
    if (depth < 6) {
      const angle = Math.atan2(y, x) - turn;
      const highlight = 0.7 * Math.cos(5 * angle) + 0.3 * Math.cos(8 * angle + 1);
      if (depth < 1) p.blendPx(sx, sy, colors[1], 0.82);
      else if (depth < 2.5) p.blendPx(sx, sy, colors[highlight > 0.32 ? 4 : 3], 0.88);
      else p.blendPx(sx, sy, colors[2], Math.max(0, 1 - depth / 6) * (highlight > 0.32 ? 0.82 : 0.44));
      return;
    }

    // 地面纹理透过场内暗雾，边缘和中心稍深。
    const haze = Math.max(0, 1 - depth / 10) + 0.7 * (1 - distance / RADIUS) ** 3;
    p.blendPx(sx, sy, colors[0], 0.1 + 0.24 * haze);
  });
}

function drawSpiral(p, colors, phase) {
  // 低亮度流纹从外缘扫向中心，接续各束短促的亮流。
  for (let arm = 0; arm < 4; arm++) {
    const angle = TAU * arm / 4 + 0.16 * Math.sin(TAU * phase + arm);
    for (let step = 0; step < 32; step++) {
      const inward = step / 32;
      const distance = 61 - 53 * inward;
      const direction = angle + 1.65 * inward * inward;
      const crest = Math.max(0, Math.cos(TAU * (1.7 * inward - 2 * phase) + arm)) ** 3;
      const opacity = (0.06 + 0.46 * crest) * Math.sin(Math.PI * inward);
      const width = 1.2 + 1.3 * crest;
      p.disc(Math.cos(direction) * distance, Math.sin(direction) * distance, width, colors[2], opacity);
    }
  }
}

export function draw(p, t, o) {
  const colors = fit(o.palette, 6);
  const phase = t / meta.duration;
  drawField(p, colors, TAU * phase);
  drawSpiral(p, colors, phase);

  // 粒子从边缘出生，越接近中心越快，亮头和暗尾沿同一条轨迹。
  cycle(t, meta.duration, 44, o.seed, (r) => r.range(0.8, 1.16), (age, life, r, i) => {
    const sweep = i % 5 === 0;
    const start = r.range(sweep ? 58 : 45, 62);
    const end = r.range(6, 10);
    const angle = r.range(0, TAU);
    const turn = r.range(1.0, 1.65);
    const progress = age / life;
    const fade = Math.min(1, age / 0.12, (life - age) / 0.15);
    const trail = sweep ? 0.36 : r.range(0.09, 0.16);
    const segments = sweep ? 24 : 5;
    let previousX, previousY;

    for (let step = 0; step <= segments; step++) {
      const along = step / segments;
      const u = Math.max(0, progress - trail * (1 - along));
      const distance = start + (end - start) * u * (0.35 + 0.65 * u);
      const direction = angle + turn * u * u;
      const x = Math.cos(direction) * distance;
      const y = Math.sin(direction) * distance;
      if (sweep && u > 0) {
        // 用低透明度的宽流带托住连续亮脊，方向由亮头带出。
        const width = 1.4 + 1.3 * Math.sin(Math.PI * along);
        p.disc(x, y, width, colors[along > 0.6 ? 3 : 2], fade * along * 0.52);
      }
      if (step > 0) {
        const color = colors[along > 0.8 ? 4 : along > 0.4 ? 3 : 2];
        p.line(previousX, previousY, x, y, color, fade * (0.25 + 0.75 * along));
      }
      previousX = x;
      previousY = y;
    }

    p.dot(previousX, previousY, colors[sweep ? 5 : 4], fade);
    if (sweep) p.glow(previousX, previousY, 2, colors[4], 0.24 * fade);
  });
}
