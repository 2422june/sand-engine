// Game Design System 편집기 — 로컬 전용 Node 서버.
//
// 4개 설계 문서(Document / Rule Book / Blue Print / Document Rule)를 실제 레포 파일로
// 읽고/쓰고, 화면 설계 이미지를 게임별 폴더로 관리한다. (AI 연결 없음 — 순수 편집기)
//
// 실행: `node tools/gds-editor/server.mjs`  (또는 `npm run gds`)
// 실제 파일을 쓰는 로컬 도구이므로 절대 공개 배포하지 말 것.

import { createServer } from "node:http";
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", ".."); // sand-engine/
const GDS_ROOT = join(REPO_ROOT, "game-design-system");
const PUBLIC_DIR = join(__dirname, "public");

const PORT = Number(process.env.GDS_PORT ?? 4321);

const SHARED = {
  rulebook: join(GDS_ROOT, "RULEBOOK.md"),
  docrule: join(GDS_ROOT, "documents", "DOCUMENT_RULES.md"),
};
const IMAGE_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/** 게임 id는 파일/폴더명에 그대로 쓰이므로 안전 문자만 허용(경로 탈출 방지). */
function safeId(id) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]*$/i.test(id)) {
    throw new Error(`invalid id: ${id}`);
  }
  return id;
}

/** (type,id) → 실제 파일 경로. */
function docPath(type, id) {
  switch (type) {
    case "rulebook":
      return SHARED.rulebook;
    case "docrule":
      return SHARED.docrule;
    case "document":
      return join(GDS_ROOT, "documents", `${safeId(id)}.md`);
    case "blueprint":
      return join(GDS_ROOT, "blueprints", safeId(id), "Blue Print.md");
    default:
      throw new Error(`unknown doc type: ${type}`);
  }
}

function imagesDir(id) {
  return join(GDS_ROOT, "documents", safeId(id), "wireframes");
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** documents/*.md 중 실제 게임 Document만 골라 게임 목록을 만든다. */
async function listGames() {
  const dir = join(GDS_ROOT, "documents");
  const entries = await readdir(dir, { withFileTypes: true });
  const games = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    if (e.name === "DOCUMENT_RULES.md" || e.name === "README.md") continue;
    const id = e.name.slice(0, -3);
    games.push({ id, hasBlueprint: await exists(docPath("blueprint", id)) });
  }
  games.sort((a, b) => a.id.localeCompare(b.id));
  return games;
}

async function listImages(id) {
  const dir = imagesDir(id);
  if (!(await exists(dir))) return [];
  const files = await readdir(dir);
  return files.filter((f) => IMAGE_MIME[extname(f).toLowerCase()]).sort();
}

// ── HTTP ────────────────────────────────────────────────────────────────────

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 64 * 1024 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolvePromise(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function serveStatic(res, urlPath) {
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const buf = await readFile(filePath);
    const mime =
      { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[extname(filePath)] ??
      "application/octet-stream";
    res.writeHead(200, { "content-type": `${mime}; charset=utf-8` });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (!p.startsWith("/api/")) {
      await serveStatic(res, p);
      return;
    }

    if (p === "/api/games" && req.method === "GET") {
      sendJson(res, 200, { games: await listGames() });
      return;
    }

    if (p === "/api/file" && req.method === "GET") {
      const type = url.searchParams.get("type");
      const id = url.searchParams.get("id") ?? "";
      const path = docPath(type, id);
      const content = (await exists(path)) ? await readFile(path, "utf8") : "";
      sendJson(res, 200, { content, path: path.replace(REPO_ROOT + "/", "") });
      return;
    }

    if (p === "/api/file" && req.method === "PUT") {
      const { type, id, content } = JSON.parse((await readBody(req)).toString("utf8"));
      const path = docPath(type, id);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content ?? "", "utf8");
      sendJson(res, 200, { ok: true, path: path.replace(REPO_ROOT + "/", "") });
      return;
    }

    if (p === "/api/images" && req.method === "GET") {
      const id = url.searchParams.get("id") ?? "";
      sendJson(res, 200, { images: await listImages(id) });
      return;
    }

    if (p === "/api/image" && req.method === "GET") {
      const id = url.searchParams.get("id") ?? "";
      const name = url.searchParams.get("name") ?? "";
      if (!/^[\w.-]+$/.test(name)) throw new Error("bad name");
      const buf = await readFile(join(imagesDir(id), name));
      res.writeHead(200, { "content-type": IMAGE_MIME[extname(name).toLowerCase()] ?? "application/octet-stream" });
      res.end(buf);
      return;
    }

    if (p === "/api/upload" && req.method === "POST") {
      const { id, name, dataBase64 } = JSON.parse((await readBody(req)).toString("utf8"));
      if (!/^[\w.-]+$/.test(name) || !IMAGE_MIME[extname(name).toLowerCase()]) throw new Error("bad image name");
      const dir = imagesDir(id);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, name), Buffer.from(dataBase64, "base64"));
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "unknown endpoint" });
  } catch (err) {
    sendJson(res, 500, { error: String(err?.message ?? err) });
  }
});

server.listen(PORT, () => {
  console.log(`GDS 편집기: http://localhost:${PORT}`);
  console.log(`  루트: ${GDS_ROOT}`);
});
