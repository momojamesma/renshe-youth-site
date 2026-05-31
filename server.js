const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const PRIVATE_DIR = path.join(__dirname, "private");
const DATA_DIR = path.join(__dirname, "data");
const SITE_DATA_PATH = path.join(DATA_DIR, "site-data.json");
const ADMINS_PATH = path.join(DATA_DIR, "admins.json");
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "renshe2026";
const ADMIN_ROUTE = "/manage-console";

const sessions = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function readSiteData() {
  return JSON.parse(fs.readFileSync(SITE_DATA_PATH, "utf8"));
}

function writeSiteData(nextData) {
  fs.writeFileSync(SITE_DATA_PATH, JSON.stringify(nextData, null, 2), "utf8");
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function ensureAdminsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let admins = [];
  if (fs.existsSync(ADMINS_PATH)) {
    admins = JSON.parse(fs.readFileSync(ADMINS_PATH, "utf8"));
  }

  const seedAdmins = [
    { username: ADMIN_USER, password: ADMIN_PASSWORD },
    { username: "test_admin", password: "youthhss2026" }
  ];

  let changed = false;
  for (const account of seedAdmins) {
    const existingIndex = admins.findIndex((item) => item.username === account.username);
    const nextRecord = {
      username: account.username,
      passwordHash: hashPassword(account.password),
      createdAt: new Date().toISOString()
    };

    if (existingIndex === -1) {
      admins.push(nextRecord);
      changed = true;
      continue;
    }

    if (admins[existingIndex].passwordHash !== nextRecord.passwordHash) {
      admins[existingIndex] = {
        ...admins[existingIndex],
        passwordHash: nextRecord.passwordHash
      };
      changed = true;
    }
  }

  if (!fs.existsSync(ADMINS_PATH) || changed) {
    fs.writeFileSync(ADMINS_PATH, JSON.stringify(admins, null, 2), "utf8");
  }
}

function readAdmins() {
  ensureAdminsFile();
  return JSON.parse(fs.readFileSync(ADMINS_PATH, "utf8"));
}

function writeAdmins(admins) {
  fs.writeFileSync(ADMINS_PATH, JSON.stringify(admins, null, 2), "utf8");
}

function sanitizeOrganizationInput(current, incoming) {
  if (!incoming || typeof incoming !== "object") {
    return current;
  }

  return {
    ...current,
    name: typeof incoming.name === "string" ? incoming.name : current.name,
    tagline: typeof incoming.tagline === "string" ? incoming.tagline : current.tagline,
    mission: typeof incoming.mission === "string" ? incoming.mission : current.mission,
    about: Array.isArray(incoming.about) ? incoming.about : current.about,
    highlights: Array.isArray(incoming.highlights) ? incoming.highlights : current.highlights
  };
}

function sanitizePublicationsInput(current, incoming) {
  if (!Array.isArray(incoming)) {
    return current;
  }

  return incoming.map((item, index) => ({
    id: Number.isFinite(Number(item.id)) ? Number(item.id) : Date.now() + index,
    title: typeof item.title === "string" ? item.title : "",
    issue: typeof item.issue === "string" ? item.issue : "",
    description: typeof item.description === "string" ? item.description : "",
    status: typeof item.status === "string" ? item.status : ""
  }));
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) {
      return acc;
    }
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function getSession(req) {
  const cookies = parseCookies(req);
  if (!cookies.sessionId) {
    return null;
  }
  const session = sessions.get(cookies.sessionId);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(cookies.sessionId);
    return null;
  }
  return { id: cookies.sessionId, ...session };
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return session;
}

function serveStaticFile(filePath, res) {
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(res, 404, "Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

function servePrivateFile(filePath, res) {
  if (!filePath.startsWith(PRIVATE_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(res, 404, "Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, status: "healthy" });
    return true;
  }

  if (pathname === "/api/site-data" && req.method === "GET") {
    sendJson(res, 200, readSiteData());
    return true;
  }

  if (pathname === "/api/login" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const admins = readAdmins();
      const matched = admins.find(
        (item) =>
          item.username === body.username && item.passwordHash === hashPassword(body.password || "")
      );
      if (!matched) {
        sendJson(res, 401, { error: "帳號或密碼錯誤" });
        return true;
      }

      const sessionId = crypto.randomBytes(24).toString("hex");
      sessions.set(sessionId, {
        username: matched.username,
        expiresAt: Date.now() + 1000 * 60 * 60 * 12
      });

      sendJson(
        res,
        200,
        { ok: true, username: matched.username },
        {
          "Set-Cookie": `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax`
        }
      );
      return true;
    } catch (error) {
      sendJson(res, 400, { error: "登入資料格式錯誤" });
      return true;
    }
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    const cookies = parseCookies(req);
    if (cookies.sessionId) {
      sessions.delete(cookies.sessionId);
    }
    sendJson(
      res,
      200,
      { ok: true },
      { "Set-Cookie": "sessionId=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" }
    );
    return true;
  }

  if (pathname === "/api/admin/session" && req.method === "GET") {
    const session = getSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Unauthorized" });
      return true;
    }
    sendJson(res, 200, { username: session.username, adminRoute: ADMIN_ROUTE });
    return true;
  }

  if (pathname === "/api/admin/accounts" && req.method === "GET") {
    if (!requireAuth(req, res)) {
      return true;
    }

    const admins = readAdmins().map((item) => ({
      username: item.username,
      createdAt: item.createdAt || null
    }));
    sendJson(res, 200, { admins });
    return true;
  }

  if (pathname === "/api/admin/accounts" && req.method === "POST") {
    if (!requireAuth(req, res)) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!username || !password) {
        sendJson(res, 400, { error: "請輸入新管理員帳號與密碼" });
        return true;
      }

      const admins = readAdmins();
      if (admins.some((item) => item.username === username)) {
        sendJson(res, 409, { error: "此管理員帳號已存在" });
        return true;
      }

      admins.push({
        username,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
      });
      writeAdmins(admins);
      sendJson(res, 201, {
        ok: true,
        admins: admins.map((item) => ({
          username: item.username,
          createdAt: item.createdAt || null
        }))
      });
      return true;
    } catch (error) {
      sendJson(res, 400, { error: "新增管理員失敗" });
      return true;
    }
  }

  if (pathname === "/api/admin/site-data" && req.method === "PUT") {
    if (!requireAuth(req, res)) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const current = readSiteData();
      const nextData = {
        ...current,
        organization: sanitizeOrganizationInput(current.organization, body.organization),
        donation: {
          ...current.donation,
          ...body.donation
        },
        publications: sanitizePublicationsInput(current.publications, body.publications)
      };
      writeSiteData(nextData);
      sendJson(res, 200, nextData);
      return true;
    } catch (error) {
      sendJson(res, 400, { error: "更新資料失敗" });
      return true;
    }
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, pathname);
      if (!handled) {
        sendText(res, 404, "Not Found");
      }
      return;
    }

    if (pathname === "/admin.html" || pathname === "/admin.js") {
      sendText(res, 404, "Not Found");
      return;
    }

    if (pathname === ADMIN_ROUTE) {
      servePrivateFile(path.join(PRIVATE_DIR, "admin.html"), res);
      return;
    }

    if (pathname === `${ADMIN_ROUTE}.js`) {
      servePrivateFile(path.join(PRIVATE_DIR, "admin.js"), res);
      return;
    }

    const normalizedPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.join(PUBLIC_DIR, normalizedPath);
    serveStaticFile(filePath, res);
  } catch (error) {
    sendJson(res, 500, { error: "Server error" });
  }
});

ensureAdminsFile();

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
