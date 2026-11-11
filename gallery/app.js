// The gallery: every effect playing live from its own code. Tiles start when they scroll into view; a click
// opens one effect with its options, a sprite sheet and the code to use it.

import { effects, categories } from "../src/fx/index.js";
import { createFrame, clearFrame, createFx, createAct, actBounds, composite, backdrop, drawActor, painterFor, stockActor, actorAlphaOf, PAL, BACKDROPS } from "../src/core/index.js";

const REPO = "https://github.com/patch-gg/pixelfx";
const FX = Object.entries(effects).map(([id, mod]) => {
  const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
  return { id, cat: id.split("/")[0], name: meta.name, mod: { ...mod, meta }, meta };
});
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
// full-screen effects (transitions, weather, impact frames) fill a 16:9 stage edge to edge instead of floating in it
const isScreen = (fx) => fx.meta.size[0] >= 320 && Math.abs(fx.meta.size[0] / fx.meta.size[1] - 16 / 9) < 0.05;
const $ = (s) => document.querySelector(s);
function el(tag, props = {}, kids = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of [].concat(kids)) e.append(k);
  return e;
}

// ---- a live effect on a canvas, at an integer scale that fits the stage
class Player {
  constructor(canvas, fx, aspect, pad) {
    Object.assign(this, { canvas, fx, ctx: canvas.getContext("2d"), opts: {}, flip: false, actor: true, speed: 1, fps: fx.meta.fps, playing: true, sheetScale: 1 });
    this.bg = fx.meta.bg;
    this.layout(aspect, pad);
  }
  // the art-pixel stage: the effect's canvas plus some room, stretched to the tile's aspect; CSS scales it up
  layout(aspect, pad) {
    Object.assign(this, { aspect, pad });
    // an act needs room for the whole performance, not just the effect's canvas
    const acted = this.acted, b = acted ? { ...actBounds(this.fx.mod) } : null;
    // an act happens above the floor: don't spend the tile on bricks
    if (b) b.y1 = Math.min(b.y1, 22);
    const [w, h] = acted ? [b.x1 - b.x0, b.y1 - b.y0] : this.fx.meta.size, [ox, oy] = acted ? [-b.x0, -b.y0] : this.fx.meta.origin;
    this.W = Math.ceil(Math.max(w * (acted ? Math.min(pad, 1.1) : pad), h * (acted ? Math.min(pad, 1.1) : pad) * aspect));
    this.H = Math.ceil(this.W / aspect);
    this.x = Math.floor((this.W - w) / 2) + ox;
    // an act stands near the bottom of its tile, with the room above it
    this.y = acted ? Math.max(oy + 2, this.H - b.y1 - 2) : Math.floor((this.H - h) / 2) + oy;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    // pixel art stays nearest at every size: smoothing hides the pixel grid the zoom is there to show
    this.canvas.style.imageRendering = "pixelated";
    this.frame = createFrame(this.W, this.H);
    this.img = this.ctx.createImageData(this.W, this.H);
    // effect layer on its own canvas, so zoom can scale it without touching the backdrop
    this.eff = document.createElement("canvas");
    this.eff.width = this.W;
    this.eff.height = this.H;
    this.effCtx = this.eff.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.setBg(this.bg);
    this.restart();
  }
  setBg(kind) {
    this.bg = kind;
    this.bgBuf = kind === "none" ? null : backdrop(kind, this.W, this.H, this.y);
    const empty = createFrame(this.W, this.H), data = new Uint8ClampedArray(this.W * this.H * 4);
    composite(empty, data, this.bgBuf);
    this.bgImage = new ImageData(data, this.W, this.H);
    this.dirty = true;
  }
  // export scale doubles as the on-stage zoom: the effect layer scales about the stage centre,
  // the backdrop stays put. 100% is the native size; 200% shows bigger pixels.
  setScale(s) {
    this.sheetScale = s;
    this.dirty = true;
  }
  paint(sx = 0, sy = 0) {
    const s = this.sheetScale, W = this.W, H = this.H, ax = this.x, ay = this.y;
    this.ctx.putImageData(this.bgImage, 0, 0);
    this.effCtx.putImageData(this.img, 0, 0);
    // scale about the effect's origin (its feet/ground point) so the floor stays put
    this.ctx.drawImage(this.eff, ax - ax * s + sx, ay - ay * s + sy, W * s, H * s);
  }
  // an effect with an act plays it, unless the character is switched off
  get acted() {
    return !!this.fx.mod.act && this.actor;
  }
  restart() {
    this.inst = (this.acted ? createAct : createFx)(this.fx.mod, { x: this.x, y: this.y, flip: this.flip, ...this.opts });
    this.acc = 0;
    this.wait = 0;
    this.dirty = true;
  }
  tick(dt) {
    const m = this.fx.meta, step = 1 / this.fps;
    if (this.playing) this.acc = Math.min(this.acc + dt * this.speed, 0.25);
    let moved = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (!m.loop && (this.acted ? this.inst.done() : this.inst.t >= m.duration)) {
        this.wait += step;
        if (this.wait > 0.45) this.restart();
      } else this.inst.update(step);
      moved = true;
    }
    if (moved || this.dirty) this.render();
  }
  seek(t) {
    this.restart();
    this.inst.update(t);
    this.render();
  }
  render() {
    const f = clearFrame(this.frame);
    if (this.acted) {
      this.inst.draw(f);
      composite(f, this.img.data, null);
      const [sx, sy] = this.inst.shake;
      this.paint(sx, sy);
      this.dirty = false;
      return;
    }
    this.inst.draw(f, "back");
    const m = this.fx.meta, tt = m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
    if (m.actor && this.actor) drawActor(painterFor(f).place(this.x, this.y, this.flip), this.inst.options.actor ?? stockActor(), actorAlphaOf(this.fx.mod, tt, this.inst.options));
    this.inst.draw(f, "front");
    composite(f, this.img.data, null);
    this.paint();
    this.dirty = false;
  }
}

// ---- deleting your own effects: only custom/ tiles, only from the local server (the static build has no endpoint)
let canDelete = false;
const deletable = (fx) => canDelete && fx.id.startsWith("custom/");
async function remove(fx) {
  if (!confirm(`Delete ${fx.id}?\n\nThis removes src/fx/${fx.id}.js and rebuilds the registry. It cannot be undone.`)) return;
  try {
    const r = await fetch(`/api/fx/${fx.id}`, { method: "DELETE" });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
    location.reload();
  } catch (e) {
    alert(`Delete failed: ${e.message}\n\nRight-click delete is only available under the local node tools/serve.mjs.`);
  }
}

// ---- tiles
const tiles = [];
const sections = [];
function build() {
  $("#count").textContent = FX.length;
  const main = $("#grid");
  for (const c of categories) {
    const list = FX.filter((f) => f.cat === c.id);
    if (!list.length) continue;
    const grid = el("div", { className: "grid" });
    const sec = el("section", { id: c.id }, [el("div", { className: "section-head" }, [el("h2", { textContent: c.name + "." }), el("p", { textContent: c.blurb })]), grid]);
    sections.push({ c, sec, list });
    for (const fx of list) {
      const cv = el("canvas", { ariaLabel: fx.name });
      const b = fx.mod.act ? actBounds(fx.mod) : null, [fw, fh] = b ? [b.x1 - b.x0, b.y1 - b.y0] : fx.meta.size;
      const fig = el("figure", { className: isScreen(fx) ? "tile big screen" : fw > 200 || fh > 170 || (b && (fw > 130 || fx.mod.act.target || fx.mod.act.targets)) ? "tile big" : "tile", tabIndex: 0 }, [
        el("div", { className: "stage" }, cv),
        el("figcaption", {}, [el("b", { textContent: fx.name }), el("small", { textContent: fx.meta.loop ? "loop" : `${+fx.meta.duration.toFixed(2)}s` })]),
      ]);
      const t = { fx, fig, cv, player: null, visible: false, hover: false };
      fig.addEventListener("click", () => openDetail(fx));
      fig.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openDetail(fx)));
      fig.addEventListener("pointerenter", () => (t.hover = true));
      fig.addEventListener("pointerleave", () => (t.hover = false));
      fig.addEventListener("contextmenu", (e) => {
        if (!deletable(fx)) return;
        e.preventDefault();
        remove(fx);
      });
      grid.append(fig);
      tiles.push(t);
    }
    main.append(sec);
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const t = tiles.find((x) => x.fig === e.target);
      t.visible = e.isIntersecting;
      if (t.visible && !t.player) {
        t.player = isScreen(t.fx) ? new Player(t.cv, t.fx, 16 / 9, 1) : new Player(t.cv, t.fx, 6 / 5, 1.25);
        if (reduced) t.player.seek(t.fx.meta.duration * 0.4);
      }
    }
  }, { rootMargin: "200px" });
  tiles.forEach((t) => io.observe(t.fig));
}

// ---- filters
const state = { cat: "all", q: "" };
function chips() {
  const box = $("#chips");
  const mk = (id, label, n) => {
    const b = el("button", { className: "chip", type: "button" }, [label, el("span", { textContent: n })]);
    b.dataset.cat = id;
    b.addEventListener("click", () => setCat(id));
    box.append(b);
  };
  mk("all", "all", FX.length);
  for (const s of sections) mk(s.c.id, s.c.name, s.list.length);
}
function setCat(id, fromHash = false) {
  state.cat = sections.some((s) => s.c.id === id) ? id : "all";
  document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
  if (!fromHash) history.replaceState(null, "", state.cat === "all" ? location.pathname : "#" + state.cat);
  filter();
  if (!fromHash) window.scrollTo({ top: 0 });
}
function filter() {
  const q = state.q.trim().toLowerCase();
  let shown = 0;
  for (const s of sections) {
    let any = false;
    for (const fx of s.list) {
      const t = tiles.find((x) => x.fx === fx);
      const hit = (state.cat === "all" || state.cat === s.c.id) && (!q || [fx.id, fx.name, fx.meta.desc, ...fx.meta.tags].join(" ").toLowerCase().includes(q));
      t.fig.hidden = !hit;
      any ||= hit;
      shown += hit;
    }
    s.sec.hidden = !any;
  }
  $("#none").hidden = shown > 0;
}

// ---- detail
let detail = null;
function openDetail(fx) {
  const d = $("#detail");
  const big = $("#big"), screen = isScreen(fx);
  big.parentElement.classList.toggle("screen", screen);
  detail = screen ? new Player(big, fx, 16 / 9, 1) : new Player(big, fx, 16 / 10, 1.6);
  const m = fx.meta;
  $("#d-name").textContent = m.name;
  $("#d-id").textContent = fx.id;
  $("#d-desc").textContent = m.desc;
  facts(fx);
  // controls
  $("#d-bg").replaceChildren(...BACKDROPS.concat("none").map((b) => btn(b, () => detail.setBg(b), b === m.bg, "bg")));
  $("#d-speed").replaceChildren(...[0.25, 0.5, 1].map((s) => btn(`${s}×`, () => (detail.speed = s), s === 1, "speed")));
  $("#d-fps").replaceChildren(
    btn(`own (${m.fps})`, () => setFps(m.fps), true, "fps"),
    ...[8, 12, 15, 24, 30, 50, 60].filter((v) => v !== m.fps).map((v) => btn(String(v), () => setFps(v), false, "fps")),
  );
  $("#d-fps-custom").value = "";
  const pal = $("#d-pal");
  pal.replaceChildren(el("option", { value: "", textContent: "its own" }), ...Object.keys(PAL).map((k) => el("option", { value: k, textContent: k })));
  pal.value = "";
  $("#d-actor").hidden = !m.actor;
  $("#d-actor").setAttribute("aria-pressed", "true");
  $("#d-flip").setAttribute("aria-pressed", "false");
  $("#d-scale").replaceChildren(...[25, 50, 100, 200].map((p) => btn(`${p}%`, () => {
    detail.setScale(p / 100);
    if ($("#d-sheet").childElementCount) sheet();
  }, p === 100, "scale")));
  $("#d-play").setAttribute("aria-pressed", "true");
  $("#d-play").textContent = "pause";
  $("#d-sheet").replaceChildren();
  $("#d-ase-out").textContent = "";
  $("#d-ase").textContent = "aseprite → jasa";
  $("#d-ase").disabled = false;
  code(fx);
  d.showModal();
  d.scrollTop = 0;
}
// what the body does around the effect, in a line: the wind-up, the freeze, the recovery
function actFacts(mod) {
  const k = mod.act.poses, lead = Math.max(0, -k[0][0]), end = k[k.length - 1][0] - mod.meta.duration, hits = (mod.act.hits ?? []).filter((h) => h.stop);
  const parts = [];
  if (lead > 0) parts.push(`${lead.toFixed(2)} s wind-up`);
  if (hits.length) parts.push(`${hits.length === 1 ? `${Math.round(hits[0].stop * 1000)} ms freeze` : `${hits.length} freezes`} at ${hits[0].t.toFixed(2)} s`);
  if (!mod.meta.loop && end > 0.02) parts.push(`${end.toFixed(2)} s recovery`);
  return parts.join(", ") || "the body moves with it";
}
// the facts panel, with the frame count for the fps currently being previewed
function facts(fx) {
  const m = fx.meta, fps = detail?.fps ?? m.fps;
  const frames = Math.max(1, Math.round(m.duration * fps)) + (m.loop ? 0 : 1);
  $("#d-facts").replaceChildren(
    ...[["kind", m.loop ? "loop" : "one-shot"], ["length", `${+m.duration.toFixed(2)} s, ${frames} frames at ${fps} fps`], ...(fx.mod.act ? [["acted", actFacts(fx.mod)]] : []), ["canvas", `${m.size[0]} × ${m.size[1]} px`], ["tags", m.tags.join(", ")]].flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: v })]),
  );
}
// changing fps resamples the simulation: same duration, fewer or more frames
function setFps(fps, fromCustom = false) {
  detail.fps = fps;
  detail.restart();
  facts(detail.fx);
  if (!fromCustom) $("#d-fps-custom").value = "";
  if ($("#d-sheet").childElementCount) sheet();
}
function btn(label, fn, on, group) {
  const b = el("button", { className: "btn", type: "button", textContent: label });
  b.setAttribute("aria-pressed", String(!!on));
  b.addEventListener("click", () => {
    if (group) b.parentElement.querySelectorAll(".btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    fn();
  });
  return b;
}
function code(fx) {
  const v = fx.id.split("/")[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const opts = { x: 160, y: 120, ...(detail.opts.palette ? { palette: "[…]" } : {}), ...(detail.flip ? { flip: true } : {}) };
  const acted = !!fx.mod.act, make = acted ? "createAct" : "createFx";
  $("#d-code").textContent = [
    `import { createFrame, ${make}, composite } from "pixelfx";`,
    `import * as ${v} from "pixelfx/fx/${fx.id}";`,
    ``,
    `const frame = createFrame(320, 180);`,
    `const fx = ${make}(${v}, ${JSON.stringify(opts).replace(/"\[…\]"/, "[…]").replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ")});`,
    ``,
    `// every tick`,
    `fx.update(dt);`,
    `fx.draw(frame);          // color + light buffers`,
    `composite(frame, imageData.data, null);`,
    ...(acted ? [``, `// your own character? read the timing: ${v}.act (poses, hits, freezes)`] : []),
  ].join("\n");
  $("#d-src").href = `${REPO}/blob/main/src/fx/${fx.id}.js`;
}
function sheet() {
  const fx = detail.fx, m = fx.meta, [w, h] = m.size, fps = detail.fps, n = Math.max(1, Math.round(m.duration * fps) + (m.loop ? 0 : 1));
  const s = detail.sheetScale ?? 1, sw = Math.max(1, Math.round(w * s)), sh = Math.max(1, Math.round(h * s));
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * h) / w)))), rows = Math.ceil(n / cols);
  const cv = el("canvas", { width: cols * sw, height: rows * sh }), ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const tmp = el("canvas", { width: w, height: h }), tctx = tmp.getContext("2d");
  const frame = createFrame(w, h), img = tctx.createImageData(w, h);
  const inst = createFx(fx.mod, { x: m.origin[0], y: m.origin[1], ...detail.opts, flip: detail.flip });
  for (let i = 0; i < n; i++) {
    if (i) inst.update(1 / fps);
    inst.draw(clearFrame(frame));
    composite(frame, img.data, null);
    tctx.putImageData(img, 0, 0);
    ctx.drawImage(tmp, 0, 0, w, h, (i % cols) * sw, Math.floor(i / cols) * sh, sw, sh);
  }
  const k = Math.max(1, Math.min(4, Math.floor(1100 / (cols * sw))));
  const pic = el("img", { src: cv.toDataURL("image/png"), alt: `${m.name} sprite sheet`, width: cols * sw * k, height: rows * sh * k });
  const pct = s === 1 ? "" : ` (${Math.round(s * 100)}%)`, flag = s === 1 ? "" : ` --scale ${Math.round(s * 100)}%`, fpsFlag = fps === m.fps ? "" : ` --fps ${fps}`;
  $("#d-sheet").replaceChildren(pic, el("p", { textContent: `${n} frames of ${sw} × ${sh} px${pct}, ${cols} across, ${fps} fps, ${m.loop ? "loops" : "plays once"}. Save the image, or run: node tools/render.mjs ${fx.id} --sheet${flag}${fpsFlag}` }));
}
function wireDetail() {
  const d = $("#detail");
  $("#d-close").addEventListener("click", () => d.close());
  d.addEventListener("close", () => (detail = null));
  d.addEventListener("click", (e) => e.target === d && d.close());
  $("#d-play").addEventListener("click", (e) => {
    detail.playing = !detail.playing;
    e.target.setAttribute("aria-pressed", String(detail.playing));
    e.target.textContent = detail.playing ? "pause" : "play";
  });
  $("#d-again").addEventListener("click", () => detail.restart());
  $("#d-flip").addEventListener("click", (e) => {
    detail.flip = !detail.flip;
    e.target.setAttribute("aria-pressed", String(detail.flip));
    detail.restart();
    code(detail.fx);
  });
  $("#d-actor").addEventListener("click", (e) => {
    detail.actor = !detail.actor;
    e.target.setAttribute("aria-pressed", String(detail.actor));
    // with an act, the character is the performance: off shows the effect alone, as a sprite sheet has it
    if (detail.fx.mod.act) detail.layout(detail.aspect, detail.pad);
    detail.dirty = true;
  });
  $("#d-seed").addEventListener("click", () => {
    detail.opts.seed = 1 + Math.floor(Math.random() * 9999);
    detail.restart();
  });
  $("#d-pal").addEventListener("change", (e) => {
    if (e.target.value) detail.opts.palette = PAL[e.target.value];
    else delete detail.opts.palette;
    detail.restart();
    code(detail.fx);
  });
  $("#d-fps-custom").addEventListener("change", (e) => {
    const v = Math.round(Number(e.target.value));
    if (!Number.isFinite(v) || v < 1 || v > 240) {
      e.target.value = "";
      e.target.placeholder = "1-240";
      return;
    }
    $("#d-fps").querySelectorAll(".btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
    setFps(v, true);
  });
  $("#d-make").addEventListener("click", sheet);
  // aseprite export runs on the local server (it has to spawn Aseprite); a static host has no endpoint
  $("#d-ase").addEventListener("click", async (e) => {
    const btn = e.target, out = $("#d-ase-out"), fx = detail.fx;
    const scale = Math.max(1, Math.min(4, Math.round(detail.sheetScale ?? 1)));
    btn.disabled = true;
    btn.textContent = "exporting…";
    out.textContent = "";
    try {
      const r = await fetch("/api/jasa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: fx.id, scale }) });
      const j = await r.json().catch(() => ({ ok: false, output: `HTTP ${r.status}` }));
      out.textContent = j.output || (j.ok ? "done" : "failed");
      btn.textContent = j.ok ? "done" : "aseprite → jasa";
    } catch {
      out.textContent = "needs `node tools/serve.mjs`";
      btn.textContent = "aseprite → jasa";
    } finally {
      btn.disabled = false;
    }
  });
  $("#d-copy").addEventListener("click", async (e) => {
    const text = $("#d-code").textContent;
    try {
      await navigator.clipboard.writeText(text);
      e.target.textContent = "copied";
    } catch {
      getSelection().selectAllChildren($("#d-code"));
      e.target.textContent = "selected";
    }
    setTimeout(() => (e.target.textContent = "copy"), 1400);
  });
}

// ---- the clock
let last = performance.now();
function frameLoop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (detail) detail.tick(dt);
  else for (const t of tiles) if (t.visible && t.player && !t.fig.hidden && (!reduced || t.hover)) t.player.tick(dt);
  requestAnimationFrame(frameLoop);
}

build();
chips();
wireDetail();
// ask the server what it can do: a static host has no delete endpoint, so the native right-click menu stays there
fetch("/api/capabilities")
  .then((r) => (r.ok ? r.json() : null))
  .then((c) => {
    canDelete = !!c?.delete;
    if (canDelete) for (const t of tiles) if (t.fx.id.startsWith("custom/")) t.fig.title = "right-click to delete";
  })
  .catch(() => {});
$("#q").addEventListener("input", (e) => {
  state.q = e.target.value;
  filter();
});
setCat(location.hash.slice(1) || "all", true);
addEventListener("hashchange", () => setCat(location.hash.slice(1) || "all", true));
requestAnimationFrame(frameLoop);
