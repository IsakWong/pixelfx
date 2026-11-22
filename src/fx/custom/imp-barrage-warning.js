import { fit } from "../../core/index.js";

export const meta = {
  name: "Imp barrage warning",
  desc: "Three ember chevrons light up in order at the root of a directional telegraph.",
  tags: ["warning", "barrage", "enemy", "ground", "directional"],
  size: [48, 24],
  origin: [24, 12],
  duration: 1.2,
  loop: true,
  fps: 20,
  bg: "ground",
  options: {
    palette: ["#3e2731", "#a22633", "#e43b44", "#f77622", "#feae34"],
  },
};

const marks = [
  { x: 5, width: 2, depth: 2, start: 0.05 },
  { x: 11, width: 3, depth: 3, start: 0.24 },
  { x: 18, width: 4, depth: 3, start: 0.5 },
];

export function draw(p, t, options) {
  const colors = fit(options.palette, 5);
  const phase = t % meta.duration;
  const charged = phase >= 0.64 && phase < 1.06;

  // 低亮度的两条刻线先给出出手方向。
  for (const side of [-1, 1]) {
    p.polyline([[1, side], [9, side * 4], [17, side * 7]], colors[0]);
    p.line(17, side * 7, 21, side * 7, charged ? colors[2] : colors[1]);
    p.px(21, side * 7, charged ? colors[3] : colors[2]);

    const litX = Math.floor(2 + phase * 27);
    if (litX >= 4 && litX <= 18) {
      const edgeY = side * Math.round(1 + (litX - 1) * 0.36);
      p.px(litX - 1, edgeY, colors[1]);
      p.px(litX, edgeY, colors[2]);
    }
  }

  // 预警光从近端依次推向远端。轮廓在整个循环里可见。
  for (const { x, width, depth, start } of marks) {
    const age = phase - start;
    const ink = age >= 0 && age < 0.12 ? colors[3]
      : charged || (age >= 0 && age < 0.31) ? colors[2] : colors[1];

    p.polyline([[x - depth - 1, -width], [x - 1, 0], [x - depth - 1, width]], colors[0]);
    p.polyline([[x - depth, -width], [x, 0], [x - depth, width]], ink);
    p.line(x - 1, -1, x - 1, 1, ink);
    if (age >= 0 && age < 0.08) {
      p.px(x, 0, colors[4]);
      p.px(x + 1, 0, colors[3]);
    }
  }
}
