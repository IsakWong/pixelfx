#!/usr/bin/env node
// 按 JASA 的导入规则渲染 pixelfx 效果：
//   60 fps（AsepriteImportConfig.DefaultFrameRate）、只允许整数倍缩放（16 PPU 像素对齐）、
//   直接产出 Assets/JASA/Content/特效/VFX_<name>.aseprite。
//
//   node tools/jasa.mjs fire/torch
//   node tools/jasa.mjs "ice/*" --scale 2
//   node tools/jasa.mjs fire/torch --out /tmp/vfx
//
// 选项：--scale N（正整数）--out DIR --pgat DIR --python EXE
//
// 产物带 `default` tag（meta.loop 时为循环）与 `unity:pivot` slice，
// VfxAsepriteProcessor 导入后生成 JasaVfx 预制体。

import { join, resolve } from "node:path";
import { ROOT, resolveIds, loadEffect, renderFrames, exportAseprite, parseScale } from "./lib/fxlib.mjs";

const JASA_FPS = 60;   // Assets/JASA/Boot/Config/AsepriteImportConfig.asset
const JASA_PPU = 16;
const DEFAULT_OUT = resolve(ROOT, "../../Assets/JASA/Content/特效");

/** Union of non-transparent pixels across every frame, in canvas pixels. */
function contentBounds(frames, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (const f of frames) {
    const d = f.clear;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const args = process.argv.slice(2), flags = {}, ids = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith("--")) ids.push(a);
  else flags[a.slice(2)] = args[++i];
}
if (!ids.length) {
  console.error("usage: node tools/jasa.mjs <id|category|pattern>... [--scale N] [--out DIR]");
  process.exit(1);
}

const scale = flags.scale === undefined ? 1 : parseScale(flags.scale);
if (!Number.isInteger(scale) || scale < 1) {
  console.error(`JASA 只允许整数倍缩放（1×、2×、3×…），收到 --scale ${flags.scale}`);
  process.exit(1);
}
const out = flags.out ? resolve(flags.out) : DEFAULT_OUT;

let failed = 0;
for (const id of resolveIds(ids)) {
  try {
    const fx = await loadEffect(id);
    const [w, h] = fx.meta.size, [ox, oy] = fx.meta.origin;
    if (!Number.isInteger(ox) || !Number.isInteger(oy))
      throw new Error(`origin 必须是整数像素：${fx.meta.origin}`);
    if (ox < 0 || ox >= w || oy < 0 || oy >= h)
      throw new Error(`origin 不在画布内：${fx.meta.origin} / ${w}x${h}`);

    const r = renderFrames(fx, { fps: JASA_FPS, actor: false, edgeFade: false });
    const name = id.split("/")[1];
    const file = exportAseprite(fx, r, {
      file: join(out, `VFX_${name}.aseprite`),
      pgat: flags.pgat,
      python: flags.python,
      scale,
    });

    const world = `${(w * scale / JASA_PPU).toFixed(2)}×${(h * scale / JASA_PPU).toFixed(2)} 格`;
    const notes = [];
    if (fx.meta.loop)
      notes.push("循环特效：VfxAsepriteProcessor 写 Lifetime=0 且循环不触发 OnClipEnd，需运行时 SetLifetime");
    console.log(`${id}  ${r.n} frames @${JASA_FPS}fps  ->  ${file}`);
    // size 是画布，不是内容：世界尺寸要按内容包围盒看，锚点由 unity:pivot 决定。
    console.log(`  画布 ${w * scale}×${h * scale} px = ${world}`);
    const b = contentBounds(r.frames, w, h);
    if (b) {
      const l = (b.x - ox) * scale, t = (b.y - oy) * scale;
      const rr = (b.x + b.w - 1 - ox) * scale, bb = (b.y + b.h - 1 - oy) * scale;
      console.log(`  内容 ${b.w * scale}×${b.h * scale} px = ${(b.w * scale / JASA_PPU).toFixed(2)}×${(b.h * scale / JASA_PPU).toFixed(2)} 格`);
      console.log(`  锚点相对范围 x[${l},${rr}] y[${t},${bb}] px`);
    } else {
      console.log("  内容为空（所有帧透明）");
    }
    for (const n of notes) console.log(`  ⚠ ${n}`);
  } catch (e) {
    failed++;
    console.error(`${id}  FAILED: ${e.message ?? e}`);
  }
}
process.exit(failed ? 1 : 0);
