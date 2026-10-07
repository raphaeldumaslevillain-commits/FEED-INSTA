const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const value = (flag, fallback) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const port = Number(value("--port", "4173"));
const host = value("--host", "127.0.0.1");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".md": "text/plain; charset=utf-8",
};
const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
  } catch (_) {
    res.writeHead(400).end();
    return;
  }
  if (pathname.split("/").some((segment) => segment.startsWith("."))) {
    res.writeHead(403).end();
    return;
  }
  const file = path.resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (error, buffer) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Introuvable");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") res.end();
    else res.end(buffer);
  });
});
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.listen(port, host, () => console.log(`Aperçu : http://${host}:${port}`));
