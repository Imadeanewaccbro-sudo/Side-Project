import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/test.js": ["test.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"]
};

const server = http.createServer((req, res) => {
  const entry = files[req.url];
  if (entry) {
    const [filename, contentType] = entry;
    const body = fs.readFileSync(path.join(__dirname, filename));
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    res.end(body);
    return;
  }

  if (req.url === "/dummy-upload" && req.method === "POST") {
    let bytes = 0;
    req.on("data", chunk => { bytes += chunk.length; });
    req.on("end", () => {
      console.log(`[dummy-upload] received ${bytes} bytes; discarded.`);
      res.writeHead(204);
      res.end();
    });
    return;
  }

  res.writeHead(404, {"Content-Type": "text/plain"});
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Privacy Monitor test site: http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});
