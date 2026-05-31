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
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOW_TEST_ADMIN =
  process.env.ALLOW_TEST_ADMIN === "true" ||
  (!IS_PRODUCTION && process.env.ALLOW_TEST_ADMIN !== "false");

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

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function getSeedAdmins() {
  const seedAdmins = [{ username: ADMIN_USER, password: ADMIN_PASSWORD }];
  if (ALLOW_TEST_ADMIN) {
    seedAdmins.push({ username: "test_admin", password: "youthhss2026" });
  }
  return seedAdmins;
}

function normalizeAdminRecord(admin, fallbackCreatedAt = new Date().toISOString()) {
  return {
    username: admin.username,
    passwordHash: admin.passwordHash,
    createdAt: admin.createdAt || fallbackCreatedAt
  };
}

function buildSeededAdmins(existingAdmins) {
  const adminMap = new Map(
    existingAdmins.map((admin) => [admin.username, normalizeAdminRecord(admin)])
  );

  for (const account of getSeedAdmins()) {
    const existing = adminMap.get(account.username);
    adminMap.set(account.username, {
      username: account.username,
      passwordHash: hashPassword(account.password),
      createdAt: existing?.createdAt || new Date().toISOString()
    });
  }

  if (!ALLOW_TEST_ADMIN) {
    adminMap.delete("test_admin");
  }

  return Array.from(adminMap.values()).sort((left, right) =>
    left.username.localeCompare(right.username)
  );
}

function createFileStore() {
  return {
    async init() {
      ensureDataDirectory();

      if (!fs.existsSync(SITE_DATA_PATH)) {
        throw new Error(`Missing site data file: ${SITE_DATA_PATH}`);
      }

      const existingAdmins = fs.existsSync(ADMINS_PATH) ? readJsonFile(ADMINS_PATH) : [];
      writeJsonFile(ADMINS_PATH, buildSeededAdmins(existingAdmins));
    },

    async readSiteData() {
      return readJsonFile(SITE_DATA_PATH);
    },

    async writeSiteData(nextData) {
      writeJsonFile(SITE_DATA_PATH, nextData);
      return nextData;
    },

    async readAdmins() {
      return readJsonFile(ADMINS_PATH);
    },

    async writeAdmins(admins) {
      writeJsonFile(ADMINS_PATH, admins);
      return admins;
    }
  };
}

function createPostgresStore(connectionString) {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("render.com") ? { rejectUnauthorized: false } : false
  });

  async function seedSiteData() {
    const existing = await pool.query(
      "SELECT value FROM site_content WHERE key = 'site_data' LIMIT 1"
    );
    if (existing.rowCount > 0) {
      return;
    }

    const initialSiteData = readJsonFile(SITE_DATA_PATH);
    await pool.query(
      "INSERT INTO site_content (key, value) VALUES ('site_data', $1::jsonb)",
      [JSON.stringify(initialSiteData)]
    );
  }

  async function syncSeedAdmins() {
    const result = await pool.query(
      "SELECT username, password_hash AS \"passwordHash\", created_at AS \"createdAt\" FROM admin_accounts"
    );
    const seededAdmins = buildSeededAdmins(result.rows);

    await pool.query("BEGIN");
    try {
      await pool.query("DELETE FROM admin_accounts");
      for (const admin of seededAdmins) {
        await pool.query(
          `INSERT INTO admin_accounts (username, password_hash, created_at)
           VALUES ($1, $2, $3)`,
          [admin.username, admin.passwordHash, admin.createdAt]
        );
      }
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  return {
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_content (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_accounts (
          username TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await seedSiteData();
      await syncSeedAdmins();
    },

    async readSiteData() {
      const result = await pool.query(
        "SELECT value FROM site_content WHERE key = 'site_data' LIMIT 1"
      );
      if (result.rowCount === 0) {
        throw new Error("Missing site_data record");
      }
      return result.rows[0].value;
    },

    async writeSiteData(nextData) {
      await pool.query(
        `INSERT INTO site_content (key, value)
         VALUES ('site_data', $1::jsonb)
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value`,
        [JSON.stringify(nextData)]
      );
      return nextData;
    },

    async readAdmins() {
      const result = await pool.query(
        `SELECT username, password_hash AS "passwordHash", created_at AS "createdAt"
         FROM admin_accounts
         ORDER BY username ASC`
      );

      return result.rows.map((admin) => ({
        username: admin.username,
        passwordHash: admin.passwordHash,
        createdAt:
          admin.createdAt instanceof Date ? admin.createdAt.toISOString() : admin.createdAt
      }));
    },

    async writeAdmins(admins) {
      await pool.query("BEGIN");
      try {
        await pool.query("DELETE FROM admin_accounts");
        for (const admin of admins) {
          await pool.query(
            `INSERT INTO admin_accounts (username, password_hash, created_at)
             VALUES ($1, $2, $3)`,
            [admin.username, admin.passwordHash, admin.createdAt || new Date().toISOString()]
          );
        }
        await pool.query("COMMIT");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }

      return admins;
    }
  };
}

const store = process.env.DATABASE_URL
  ? createPostgresStore(process.env.DATABASE_URL)
  : createFileStore();

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
    description: typeof item.description === "string" ? item.description : "",
    tag: typeof item.tag === "string" ? item.tag : "",
    content: typeof item.content === "string" ? item.content : ""
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
    sendJson(res, 200, {
      ok: true,
      status: "healthy",
      storage: process.env.DATABASE_URL ? "postgres" : "file"
    });
    return true;
  }

  if (pathname === "/api/site-data" && req.method === "GET") {
    sendJson(res, 200, await store.readSiteData());
    return true;
  }

  if (pathname === "/api/login" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const admins = await store.readAdmins();
      const matched = admins.find(
        (item) =>
          item.username === body.username && item.passwordHash === hashPassword(body.password || "")
      );

      if (!matched) {
        sendJson(res, 401, { error: "Invalid username or password." });
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
      sendJson(res, 400, { error: "Unable to process login request." });
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

    const admins = (await store.readAdmins()).map((item) => ({
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
        sendJson(res, 400, { error: "Username and password are required." });
        return true;
      }

      const admins = await store.readAdmins();
      if (admins.some((item) => item.username === username)) {
        sendJson(res, 409, { error: "That admin username already exists." });
        return true;
      }

      admins.push({
        username,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
      });

      await store.writeAdmins(admins);
      sendJson(res, 201, {
        ok: true,
        admins: admins
          .map((item) => ({
            username: item.username,
            createdAt: item.createdAt || null
          }))
          .sort((left, right) => left.username.localeCompare(right.username))
      });
      return true;
    } catch (error) {
      sendJson(res, 400, { error: "Unable to create admin account." });
      return true;
    }
  }

  if (pathname === "/api/admin/site-data" && req.method === "PUT") {
    if (!requireAuth(req, res)) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const current = await store.readSiteData();
      const nextData = {
        ...current,
        organization: sanitizeOrganizationInput(current.organization, body.organization),
        donation: {
          ...current.donation,
          ...body.donation
        },
        publications: sanitizePublicationsInput(current.publications, body.publications)
      };

      await store.writeSiteData(nextData);
      sendJson(res, 200, nextData);
      return true;
    } catch (error) {
      sendJson(res, 400, { error: "Unable to update site data." });
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
    console.error(error);
    sendJson(res, 500, { error: "Server error" });
  }
});

async function start() {
  await store.init();
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
