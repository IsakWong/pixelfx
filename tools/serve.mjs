#!/usr/bin/env node
// Serve the repo so the gallery can load the effects as modules: node tools/serve.mjs [port]
// then open http://localhost:8080/gallery/
//
// Also exposes POST /api/jasa so the gallery can run `tools/jasa.mjs` and write a
// `VFX_*.aseprite` straight into the game project. The browser cannot spawn Aseprite, so the
// export runs here; only the effect id and an integer scale are accepted, and the output
// directory stays whatever jasa.mjs defaults to.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { spawn } from "node:child_process";
import { ROOT } from "./lib/fxlib.mjs";

const PORT = +(process.argv[2] ?? 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8", ".mp4": "video/mp4",
};

// "category/name", both kebab-case: never a path, never a flag, never shell input
const JASA_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(JSON.stringify(body));
}

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
      return sendJson(res, 400, { ok: false, error: "bad json" });
    }
    const id = String(body.id ?? "");
    if (!JASA_ID.test(id)) return sendJson(res, 400, { ok: false, error: `bad id: ${id}` });
    const scale = Math.min(4, Math.max(1, Math.round(Number(body.scale) || 1)));
    const args = ["tools/jasa.mjs", id];
    if (scale !== 1) args.push("--scale", String(scale));
    const child = spawn(process.execPath, args, { cwd: ROOT });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => sendJson(res, 500, { ok: false, error: e.message }));
    child.on("close", (code) => {
      // absolute paths are noise in the panel; show them from `Assets/` on
      const text = (out || err).trim().replace(/\S*[\\/](Assets[\\/])/g, "$1");
      sendJson(res, code === 0 ? 200 : 500, { ok: code === 0, output: text || `exit ${code}` });
    });
  });
}

createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/jasa") return exportAseprite(req, res);

  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") return res.writeHead(302, { location: "/gallery/" }).end();
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`gallery: http://localhost:${PORT}/gallery/`));
