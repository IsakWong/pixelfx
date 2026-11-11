#!/usr/bin/env node
// Serve the repo so the gallery can load the effects as modules: node tools/serve.mjs [port]
// then open http://localhost:8080/gallery/
//
// Also exposes POST /api/jasa so the gallery can run `tools/jasa.mjs` and write a
// `VFX_*.aseprite` straight into the game project. The browser cannot spawn Aseprite, so the
// export runs here; only the effect id and an integer scale are accepted, and the output
// directory stays whatever jasa.mjs defaults to.
// Local-only: right-clicking a custom/ tile in the gallery deletes its source file and rebuilds the registry.

import { createServer } from "node:http";
import { readFile, unlink } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { ROOT } from "./lib/fxlib.mjs";

const PORT = +(process.argv[2] ?? 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8", ".mp4": "video/mp4",
};

const json = (res, status, body) =>
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(JSON.stringify(body));

// "category/name", both kebab-case: never a path, never a flag, never shell input
const JASA_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function exportAseprite(req, res) {
  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 4096) req.destroy();
  });
  req.on("end", () => {
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return json(res, 400, { ok: false, error: "bad json" });
    }
    const id = String(body.id ?? "");
    if (!JASA_ID.test(id)) return json(res, 400, { ok: false, error: `bad id: ${id}` });
    const scale = Math.min(4, Math.max(1, Math.round(Number(body.scale) || 1)));
    const args = ["tools/jasa.mjs", id];
    if (scale !== 1) args.push("--scale", String(scale));
    const child = spawn(process.execPath, args, { cwd: ROOT });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => json(res, 500, { ok: false, error: e.message }));
    child.on("close", (code) => {
      // absolute paths are noise in the panel; show them from `Assets/` on
      const text = (out || err).trim().replace(/\S*[\\/](Assets[\\/])/g, "$1");
      json(res, code === 0 ? 200 : 500, { ok: code === 0, output: text || `exit ${code}` });
    });
  });
}

// deleting writes to the repo: only the machine running the server may do it
const isLocal = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
// only effects under custom/ may be removed; the upstream categories stay read-only
const CUSTOM_ID = /^custom\/[a-z0-9][a-z0-9-]*$/;

async function deleteEffect(id) {
  if (!CUSTOM_ID.test(id)) return { status: 403, err: "only custom/<name> effects can be deleted" };
  const file = normalize(join(ROOT, "src", "fx", id + ".js"));
  if (!file.startsWith(join(ROOT, "src", "fx", "custom") + sep)) return { status: 403, err: "outside custom/" };
  try {
    await unlink(file);
  } catch (e) {
    return e.code === "ENOENT" ? { status: 404, err: `${id} not found` } : { status: 500, err: String(e.message ?? e) };
  }
  // the registry is generated: rebuild it so the effect leaves index.js, CATALOG.md and the counts too
  const r = spawnSync(process.execPath, [join(ROOT, "tools", "index.mjs")], { cwd: ROOT, encoding: "utf-8" });
  if (r.status !== 0) return { status: 500, err: `deleted ${id}, but rebuilding the registry failed: ${(r.stderr || r.stdout || "").trim()}` };
  return { status: 200, body: { ok: true, id } };
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = decodeURIComponent(url.pathname);

  if (req.method === "POST" && path === "/api/jasa") return exportAseprite(req, res);

  // what this host can do: the static build has no delete endpoint, so the gallery keeps the native menu there
  if (path === "/api/capabilities") return json(res, 200, { delete: isLocal(req) });
  if (path.startsWith("/api/fx/")) {
    if (req.method !== "DELETE") return json(res, 405, { error: "use DELETE" });
    if (!isLocal(req)) return json(res, 403, { error: "deleting effects is only available from localhost" });
    const r = await deleteEffect(path.slice("/api/fx/".length));
    return json(res, r.status, r.body ?? { error: r.err });
  }

  if (path === "/") return res.writeHead(302, { location: "/gallery/" }).end();
  const file = normalize(join(ROOT, path.endsWith("/") ? path + "index.html" : path));
  if (!file.startsWith(ROOT + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`gallery: http://localhost:${PORT}/gallery/`));
