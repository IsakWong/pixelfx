#!/usr/bin/env node
// Export sprite sheets for every effect (or some): sheets/<category>/<name>.png + .json, and sheets/index.json.
//
//   node tools/sheets.mjs            everything
//   node tools/sheets.mjs fire ice   some categories
//   node tools/sheets.mjs ice --fps 15   resample every exported sheet
//
// Options: --fps N (1-240)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, allIds, resolveIds, loadEffect, renderFrames, spriteSheet, save, parseFps } from "./lib/fxlib.mjs";
import { actTiming } from "../src/core/index.js";

const args = process.argv.slice(2), flags = {}, patterns = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) flags[args[i].slice(2)] = args[++i];
  else patterns.push(args[i]);
}
let fps;
try {
  fps = parseFps(flags.fps, undefined);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const ids = patterns.length ? resolveIds(patterns) : allIds();
const out = join(ROOT, "sheets"), index = [];
for (const id of ids) {
  const fx = await loadEffect(id), r = renderFrames(fx, { bg: "none", fps }), name = id.split("/")[1];
  const s = spriteSheet(fx, r, name);
  save(join(out, id + ".png"), s.png);
  save(join(out, id + ".json"), JSON.stringify(s.json, null, 1));
  const m = fx.meta;
  index.push({ id, name: m.name, desc: m.desc, tags: m.tags, loop: m.loop, fps: r.fps, frames: r.n, frameSize: m.size, pivot: m.origin, columns: s.json.meta.pixelfx.columns, image: `${id}.png`, ...(fx.mod.act ? { act: actTiming(fx.mod) } : {}) });
  process.stdout.write(".");
}
if (!patterns.length) writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 1));
console.log(`\n${ids.length} sheets -> sheets/`);
