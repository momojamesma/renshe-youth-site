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
const ADMIN_ROUTE = "/manage-console";
const PRIMARY_ADMIN_USERNAME = "renshe_admin";
const PRIMARY_ADMIN_PASSWORD = "RensheYouth!ed60806a73";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOW_TEST_ADMIN =
  process.env.ALLOW_TEST_ADMIN === "true" ||
  (!IS_PRODUCTION && process.env.ALLOW_TEST_ADMIN !== "false");

const sessions = new Map();
const instagramProfileCache = new Map();
const INSTAGRAM_PROFILE_CACHE_TTL_MS = 30 * 1000;
const ECPAY_TEST_CONFIG = {
  merchantId: "3002607",
  hashKey: "pwFHCqoQZGmho4w6",
  hashIV: "EkRm7iFT261dpevs",
  checkoutUrl: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
  queryUrl: "https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5"
};

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

const ADMIN_USERNAME_RULE = /^[A-Za-z0-9._]{1,30}$/;
const KEYWORD_HINTS = [
  "社會建構",
  "公共參與",
  "轉型正義",
  "自由主義",
  "自我審查",
  "霸權",
  "特權",
  "性別",
  "身分認同",
  "教育",
  "勞動",
  "民主",
  "社會學",
  "歷史",
  "文化",
  "人權",
  "青年",
  "政治",
  "媒體",
  "犯罪"
];

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function getAdminCredentialError(username, password) {
  if (!ADMIN_USERNAME_RULE.test(username)) {
    return "Username must be 1-30 characters and use only letters, numbers, underscores, or periods.";
  }

  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  return "";
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#10;", "\n")
    .replaceAll("&#13;", "\r");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLineBreaks(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function buildPublicationExcerpt(text, limit = 50) {
  const normalized = normalizeLineBreaks(text)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= limit) {
    return normalized;
  }

  const punctuationMatch = normalized
    .slice(limit)
    .match(/[。！？；.!?]/);

  if (punctuationMatch && Number.isFinite(punctuationMatch.index)) {
    const stopIndex = limit + punctuationMatch.index + 1;
    if (stopIndex <= limit + 18) {
      return `${normalized.slice(0, stopIndex).trim()}…`;
    }
  }

  return `${normalized.slice(0, limit).trim()}…`;
}

function getBaseUrl(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string" && forwardedProto.trim()
      ? forwardedProto.split(",")[0].trim()
      : process.env.NODE_ENV === "production"
        ? "https"
        : "http";
  return `${protocol}://${req.headers.host}`;
}

function getEcpayConfig() {
  const merchantId = process.env.ECPAY_MERCHANT_ID || "";
  const hashKey = process.env.ECPAY_HASH_KEY || "";
  const hashIV = process.env.ECPAY_HASH_IV || "";
  const useProduction =
    process.env.ECPAY_ENV === "production" &&
    merchantId &&
    hashKey &&
    hashIV;

  if (useProduction) {
    return {
      merchantId,
      hashKey,
      hashIV,
      checkoutUrl: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
      queryUrl: "https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5",
      sandbox: false,
      enabled: true
    };
  }

  return {
    ...ECPAY_TEST_CONFIG,
    sandbox: true,
    enabled: true
  };
}

function getPaymentGatewayPublicConfig() {
  const config = getEcpayConfig();
  return {
    provider: "ecpay",
    enabled: Boolean(config.enabled),
    sandbox: Boolean(config.sandbox),
    checkoutPath: "/api/payments/ecpay/checkout",
    methods: ["信用卡", "ATM", "超商代碼", "超商條碼"]
  };
}

function formatEcpayTradeDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function createMerchantTradeNo() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `RY${timestamp}${random}`.slice(0, 20);
}

function encodeEcpayValue(value) {
  return encodeURIComponent(value)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
}

function computeEcpayCheckMacValue(payload, hashKey, hashIV) {
  const sorted = Object.keys(payload)
    .filter((key) => key !== "CheckMacValue")
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${key}=${payload[key]}`)
    .join("&");

  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
  const encoded = encodeEcpayValue(raw);
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

function createEcpayDonationOrder(amount, req) {
  const config = getEcpayConfig();
  const baseUrl = getBaseUrl(req);
  const payload = {
    MerchantID: config.merchantId,
    MerchantTradeNo: createMerchantTradeNo(),
    MerchantTradeDate: formatEcpayTradeDate(new Date()),
    PaymentType: "aio",
    TotalAmount: Math.max(1, Math.floor(amount)),
    TradeDesc: "支持人社青年",
    ItemName: "人社青年募款",
    ReturnURL: `${baseUrl}/api/payments/ecpay/notify`,
    ChoosePayment: "ALL",
    EncryptType: 1,
    ClientBackURL: `${baseUrl}/#donate`,
    NeedExtraPaidInfo: "Y",
    CustomField1: "renshe-youth-site",
    CustomField2: config.sandbox ? "sandbox" : "production"
  };

  payload.CheckMacValue = computeEcpayCheckMacValue(payload, config.hashKey, config.hashIV);

  return {
    config,
    payload
  };
}

function buildAutoSubmitFormHtml(actionUrl, payload) {
  const fields = Object.entries(payload)
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(String(value))}" />`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>正在前往付款頁</title>
    <style>
      body { font-family: sans-serif; background:#f7f3ec; color:#243530; display:grid; place-items:center; min-height:100vh; margin:0; padding:24px; }
      main { max-width:520px; text-align:center; background:#fffaf3; border:1px solid rgba(36,53,48,.08); border-radius:20px; padding:32px 24px; box-shadow:0 18px 44px rgba(36,53,48,.08); }
      h1 { margin:0 0 12px; font-size:1.5rem; }
      p { margin:0; line-height:1.8; }
      button { margin-top:20px; min-height:46px; padding:12px 20px; border-radius:999px; border:0; background:#c77855; color:#fff; font-weight:700; cursor:pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>正在前往付款頁</h1>
      <p>系統正在為你建立綠界付款訂單，若頁面沒有自動跳轉，請點擊下方按鈕繼續。</p>
      <form id="ecpay-checkout-form" method="POST" action="${escapeHtml(actionUrl)}">
        ${fields}
        <button type="submit">前往付款</button>
      </form>
    </main>
    <script>document.getElementById("ecpay-checkout-form").submit();</script>
  </body>
</html>`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(html, attribute, key) {
  const source = String(html || "");
  const headSlice = source.slice(0, 30000);
  const attributeMarkers = [
    `${attribute}="${key}"`,
    `${attribute}='${key}'`
  ];

  for (const marker of attributeMarkers) {
    const markerIndex = headSlice.indexOf(marker);
    if (markerIndex < 0) {
      continue;
    }

    const tagStart = headSlice.lastIndexOf("<meta", markerIndex);
    const tagEnd = headSlice.indexOf(">", markerIndex);
    if (tagStart < 0 || tagEnd < 0) {
      continue;
    }

    const tagText = headSlice.slice(tagStart, tagEnd + 1);
    const contentMatch = tagText.match(/\bcontent=(["'])([\s\S]*?)\1/i);
    if (contentMatch?.[2]) {
      return decodeHtmlEntities(contentMatch[2]);
    }
  }

  const escapedKey = escapeRegExp(key);
  const fallbackPatterns = [
    new RegExp(
      `<meta[^>]+${attribute}=(["'])${escapedKey}\\1[^>]+content=(["'])([\\s\\S]*?)\\2[^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=(["'])([\\s\\S]*?)\\1[^>]+${attribute}=(["'])${escapedKey}\\3[^>]*>`,
      "i"
    )
  ];

  for (const pattern of fallbackPatterns) {
    const match = headSlice.match(pattern);
    if (match) {
      const value = match[3] || match[2];
      if (value) {
        return decodeHtmlEntities(value);
      }
    }
  }

  return "";
}

function fetchRemoteText(targetUrl, options = {}) {
  const timeoutSeconds =
    Number.isFinite(options.timeoutSeconds) && options.timeoutSeconds > 0
      ? options.timeoutSeconds
      : 12;
  const acceptHeader =
    typeof options.acceptHeader === "string" && options.acceptHeader.trim()
      ? options.acceptHeader.trim()
      : "text/html,application/xhtml+xml";
  const requestTimeoutMs = Math.max(Math.round(timeoutSeconds * 1000), 1500);

  if (typeof fetch !== "function") {
    return Promise.reject(new Error("Global fetch is not available."));
  }

  return (async () => {
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(requestTimeoutMs),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Accept: acceptHeader,
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      throw new Error(`Remote request failed with status ${response.status}.`);
    }

    return response.text();
  })();
}

async function fetchRemoteJson(targetUrl, options = {}) {
  const raw = await fetchRemoteText(targetUrl, {
    ...options,
    acceptHeader: "application/json,text/plain,*/*"
  });
  return JSON.parse(raw);
}

function validateInstagramPostUrl(input) {
  let parsedUrl;
  try {
    parsedUrl = new URL(input);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (!["instagram.com", "www.instagram.com"].includes(hostname)) {
    return null;
  }

  const parts = parsedUrl.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || !["p", "reel", "tv"].includes(parts[0])) {
    return null;
  }

  return `https://www.instagram.com/${parts[0]}/${parts[1]}/`;
}

function normalizeInstagramProfileReference(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return null;
  }

  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    const handle = raw.replace(/^@+/, "").trim();
    if (!handle) {
      return null;
    }
    return {
      handle,
      url: `https://www.instagram.com/${handle}/`
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(raw);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (!["instagram.com", "www.instagram.com"].includes(hostname)) {
    return null;
  }

  const parts = parsedUrl.pathname.split("/").filter(Boolean);
  if (parts.length < 1) {
    return null;
  }

  const handle = parts[0].replace(/^@+/, "").trim();
  if (!handle || ["p", "reel", "tv", "explore", "accounts"].includes(handle.toLowerCase())) {
    return null;
  }

  return {
    handle,
    url: `https://www.instagram.com/${handle}/`
  };
}

function parseInstagramProfileCounts(description) {
  const normalizedText = normalizeWhitespace(decodeHtmlEntities(description));
  const safePatterns = {
    followers: [
      /([\d.,]+)\s*(?:\u4f4d)?\u7c89\u7d72/i,
      /([\d.,]+)\s*followers?/i
    ],
    following: [
      /([\d.,]+)\s*(?:\u4eba)?\u8ffd\u8e64\u4e2d/i,
      /([\d.,]+)\s*following/i
    ],
    posts: [
      /([\d.,]+)\s*(?:\u5247)?\u8cbc\u6587/i,
      /([\d.,]+)\s*posts?/i
    ]
  };
  const safeCounts = {};

  for (const [key, matchers] of Object.entries(safePatterns)) {
    for (const matcher of matchers) {
      const match = normalizedText.match(matcher);
      if (match?.[1]) {
        safeCounts[key] = match[1];
        break;
      }
    }
  }

  if (safeCounts.followers || safeCounts.following || safeCounts.posts) {
    return safeCounts;
  }

  const text = normalizeWhitespace(decodeHtmlEntities(description));
  const patterns = {
    followers: [
      /([\d.,]+)\s*(?:位)?粉絲/i,
      /([\d.,]+)\s*followers?/i
    ],
    following: [
      /([\d.,]+)\s*(?:人)?追蹤中/i,
      /([\d.,]+)\s*following/i
    ],
    posts: [
      /([\d.,]+)\s*(?:則)?貼文/i,
      /([\d.,]+)\s*posts?/i
    ]
  };

  const counts = {};
  for (const [key, matchers] of Object.entries(patterns)) {
    for (const matcher of matchers) {
      const match = text.match(matcher);
      if (match?.[1]) {
        counts[key] = match[1];
        break;
      }
    }
  }

  return counts;
}

function extractInstagramProfileDescription(html) {
  const headSlice = String(html || "").slice(0, 30000);
  const patterns = [
    /<meta[^>]+property=(["'])og:description\1[^>]+content=(["'])([\s\S]*?)\2/i,
    /<meta[^>]+content=(["'])([\s\S]*?)\1[^>]+property=(["'])og:description\3/i,
    /<meta[^>]+name=(["'])description\1[^>]+content=(["'])([\s\S]*?)\2/i,
    /<meta[^>]+content=(["'])([\s\S]*?)\1[^>]+name=(["'])description\3/i
  ];

  for (const pattern of patterns) {
    const match = headSlice.match(pattern);
    const value = match?.[3] || match?.[2];
    if (value) {
      return decodeHtmlEntities(value);
    }
  }

  return "";
}

async function fetchInstagramProfileStats(reference, fallback = {}, options = {}) {
  const normalized = normalizeInstagramProfileReference(reference);
  if (!normalized) {
    throw new Error("Invalid Instagram profile reference.");
  }

  const cacheKey = normalized.handle.toLowerCase();
  const cached = instagramProfileCache.get(cacheKey);
  if (!options.force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await fetch(normalized.url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache"
    }
  });
  if (!response.ok) {
    throw new Error(`Instagram profile request failed with status ${response.status}.`);
  }
  const html = await response.text();
  const description = extractInstagramProfileDescription(html);
  const counts = parseInstagramProfileCounts(description);

  const value = {
    handle: `@${normalized.handle}`,
    url: normalized.url,
    followers: counts.followers || fallback.followers || "-",
    posts: counts.posts || fallback.posts || "-",
    following: counts.following || fallback.following || "-",
    live: Boolean(counts.followers || counts.posts || counts.following)
  };

  instagramProfileCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + INSTAGRAM_PROFILE_CACHE_TTL_MS
  });

  return value;
}

function derivePublicationFromInstagram(url, source) {
  if (source && typeof source === "object" && typeof source.title === "string") {
    const bodyText = normalizeWhitespace(source.title);
    const authorText = source.author_name ? `作者：${source.author_name}` : "";
    return {
      title: bodyText.length > 34 ? `${bodyText.slice(0, 34).trim()}…` : bodyText,
      tag: "Instagram",
      description: buildPublicationExcerpt(bodyText),
      content: [bodyText, authorText, `原始 Instagram 貼文網址：${url}`].filter(Boolean).join("\n\n")
    };
  }

  const html = String(source || "");
  const ogTitle = extractMetaContent(html, "property", "og:title");
  const ogDescription =
    extractMetaContent(html, "property", "og:description") ||
    extractMetaContent(html, "name", "description");
  const pageTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = decodeHtmlEntities(pageTitleMatch?.[1] || "");
  const combinedText = [ogTitle, ogDescription, pageTitle]
    .map(normalizeWhitespace)
    .find(Boolean);

  let caption = "";
  const quotedTitle = ogTitle.match(/on Instagram:\s*["“](.+?)["”]\s*$/i);
  const quotedDescription = ogDescription.match(/["“](.+?)["”]/);

  if (quotedTitle?.[1]) {
    caption = quotedTitle[1];
  } else if (quotedDescription?.[1]) {
    caption = quotedDescription[1];
  }

  const bodyText =
    normalizeWhitespace(caption) ||
    combinedText ||
    "此刊物由 Instagram 貼文匯入，請補充完整內容。";

  return {
    title: bodyText.length > 34 ? `${bodyText.slice(0, 34).trim()}…` : bodyText,
    tag: "Instagram",
    description: buildPublicationExcerpt(bodyText),
    content: `${bodyText}\n\n原始 Instagram 貼文網址：${url}`
  };
}

function decodeJsonLikeText(value) {
  return decodeHtmlEntities(
    normalizeLineBreaks(String(value || ""))
      .replace(/\\u003C/g, "<")
      .replace(/\\u003E/g, ">")
      .replace(/\\u0026/g, "&")
      .replace(/\\u2019/g, "’")
      .replace(/\\u201c/g, "“")
      .replace(/\\u201d/g, "”")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/")
      .replace(/\\\\/g, "\\")
  );
}

function extractJsonStringAfterMarker(source, marker) {
  const text = String(source || "");
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) {
    return "";
  }

  let value = "";
  let escaped = false;
  for (let index = markerIndex + marker.length; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      value += `\\${character}`;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (character === '"') {
      return decodeJsonLikeText(value).trim();
    }

    value += character;
  }

  return "";
}

function extractInstagramCaptionFromHtml(html) {
  const textMarkers = [
    '"edge_media_to_caption":{"edges":[{"node":{"text":"',
    '"caption":"',
    '"articleBody":"'
  ];
  const candidates = [];

  for (const marker of textMarkers) {
    const decoded = extractJsonStringAfterMarker(html, marker);
    if (decoded) {
      candidates.push(decoded);
    }
  }

  const ogDescription =
    extractMetaContent(html, "property", "og:description") ||
    extractMetaContent(html, "name", "description");
  const quotedDescription = ogDescription.match(/["“](.+?)["”]/);

  if (quotedDescription?.[1]) {
    candidates.push(normalizeLineBreaks(quotedDescription[1]).trim());
  } else if (ogDescription) {
    candidates.push(normalizeLineBreaks(ogDescription).trim());
  }

  return candidates.sort((left, right) => right.length - left.length)[0] || "";
}

function buildPublicationTitle(text) {
  const candidate =
    normalizeLineBreaks(text)
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !/^#/.test(line) && !/^原始 Instagram 貼文網址：/.test(line)) || "";
  const compact = normalizeWhitespace(candidate);
  return compact ? (compact.length > 34 ? `${compact.slice(0, 34).trim()}…` : compact) : "Instagram 匯入刊物";
}

function buildPublicationSummary(text) {
  const compact = normalizeWhitespace(
    normalizeLineBreaks(text)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^#/.test(line))
      .join(" ")
  );

  if (!compact) {
    return "此刊物由 Instagram 貼文匯入。";
  }

  const sentence = compact.match(/^.{1,120}?[。！？!?]/);
  if (sentence?.[0]) {
    return sentence[0];
  }

  return compact.length > 110 ? `${compact.slice(0, 110).trim()}…` : compact;
}

function extractHashtags(text) {
  const matches = Array.from(String(text || "").matchAll(/(^|\s)#([^\s#]+)/g));
  return Array.from(new Set(matches.map((match) => match[2].trim()).filter(Boolean)));
}

function extractKeywordNgrams(text) {
  const counts = new Map();
  const sequences = String(text || "").match(/[\u4e00-\u9fff]{2,}/g) || [];
  const stopPhrases = new Set(["我們", "你們", "他們", "這個", "一個", "不是", "可以", "如果", "因為", "所以"]);

  for (const sequence of sequences) {
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= sequence.length - size; index += 1) {
        const token = sequence.slice(index, index + size);
        if (stopPhrases.has(token) || /^([一-龥])\1+$/.test(token)) {
          continue;
        }
        counts.set(token, (counts.get(token) || 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((left, right) => (right[1] * right[0].length) - (left[1] * left[0].length))
    .map(([token]) => token);
}

function buildPublicationTag(text) {
  const hashtagTags = extractHashtags(text).slice(0, 3);
  if (hashtagTags.length > 0) {
    return hashtagTags.join(" / ");
  }

  const hinted = KEYWORD_HINTS.filter((keyword) => String(text || "").includes(keyword)).slice(0, 3);
  if (hinted.length > 0) {
    return hinted.join(" / ");
  }

  const ngramTags = extractKeywordNgrams(text).slice(0, 3);
  return ngramTags.length > 0 ? ngramTags.join(" / ") : "Instagram";
}

function buildInstagramPublicationFromSources(url, html, oembedData = null) {
  const extractedCaption = extractInstagramCaptionFromHtml(html);
  const fallbackCaption =
    oembedData && typeof oembedData.title === "string"
      ? normalizeLineBreaks(oembedData.title).trim()
      : "";
  const caption = extractedCaption || fallbackCaption || "此刊物由 Instagram 貼文匯入，請補充完整內容。";

  return {
    title: buildPublicationTitle(caption),
    tag: buildPublicationTag(caption),
    description: buildPublicationExcerpt(caption),
    content: `${caption}\n\n原始 Instagram 貼文網址：${url}`
  };
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
  const seedAdmins = [
    { username: PRIMARY_ADMIN_USERNAME, password: PRIMARY_ADMIN_PASSWORD }
  ];

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

function mergeSeedAdmins(existingAdmins) {
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
      writeJsonFile(ADMINS_PATH, mergeSeedAdmins(existingAdmins));
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
      `SELECT username, password_hash AS "passwordHash", created_at AS "createdAt"
       FROM admin_accounts
       ORDER BY username ASC`
    );
    const nextAdmins = mergeSeedAdmins(result.rows);

    await pool.query("BEGIN");
    try {
      await pool.query("DELETE FROM admin_accounts");
      for (const admin of nextAdmins) {
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

const PUBLIC_SITE_CACHE_TTL_MS = 60 * 1000;
let siteDataCache = {
  value: null,
  expiresAt: 0
};

function invalidateSiteDataCache() {
  siteDataCache = {
    value: null,
    expiresAt: 0
  };
}

async function readCachedSiteData() {
  if (siteDataCache.value && siteDataCache.expiresAt > Date.now()) {
    return siteDataCache.value;
  }

  const siteData = await store.readSiteData();
  siteDataCache = {
    value: siteData,
    expiresAt: Date.now() + PUBLIC_SITE_CACHE_TTL_MS
  };
  return siteData;
}

function resolvePublicAvatarUrl(organization = {}) {
  const avatarUrl = typeof organization.avatarUrl === "string" ? organization.avatarUrl : "";
  if (avatarUrl.startsWith("data:image/")) {
    return "/api/brand-avatar";
  }
  return avatarUrl;
}

function buildPublicOrganization(organization = {}) {
  return {
    ...organization,
    avatarUrl: resolvePublicAvatarUrl(organization)
  };
}

function buildPublicSiteData(siteData) {
  return {
    organization: buildPublicOrganization(siteData.organization || {}),
    donation: siteData.donation || {},
    paymentGateway: getPaymentGatewayPublicConfig(),
    publications: Array.isArray(siteData.publications)
      ? siteData.publications.map((item) => ({
          id: item.id,
          title: item.title,
          tag: item.tag,
          description: buildPublicationExcerpt(item.content || item.description || "")
        }))
      : []
  };
}

function buildPublicPublication(siteData, publicationId) {
  const publications = Array.isArray(siteData.publications) ? siteData.publications : [];
  const publication = publications.find((item) => Number(item.id) === Number(publicationId));
  if (!publication) {
    return null;
  }

  return {
    organization: buildPublicOrganization(siteData.organization || {}),
    publication: {
      id: publication.id,
      title: publication.title,
      tag: publication.tag,
      description: buildPublicationExcerpt(publication.content || publication.description || ""),
      content: publication.content || ""
    }
  };
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
    avatarUrl: typeof incoming.avatarUrl === "string" ? incoming.avatarUrl : current.avatarUrl,
    instagram:
      incoming.instagram && typeof incoming.instagram === "object"
        ? {
            ...(current.instagram || {}),
            handle:
              typeof incoming.instagram.handle === "string"
                ? incoming.instagram.handle
                : current.instagram?.handle,
            url:
              typeof incoming.instagram.url === "string"
                ? incoming.instagram.url
                : current.instagram?.url,
            followers:
              typeof incoming.instagram.followers === "string"
                ? incoming.instagram.followers
                : current.instagram?.followers,
            posts:
              typeof incoming.instagram.posts === "string"
                ? incoming.instagram.posts
                : current.instagram?.posts,
            following:
              typeof incoming.instagram.following === "string"
                ? incoming.instagram.following
                : current.instagram?.following
          }
        : current.instagram,
    about: Array.isArray(incoming.about) ? incoming.about : current.about,
    highlights: Array.isArray(incoming.highlights) ? incoming.highlights : current.highlights,
    appearance:
      incoming.appearance && typeof incoming.appearance === "object"
        ? {
            ...(current.appearance || {}),
            ...incoming.appearance
          }
        : current.appearance
  };
}

function sanitizeDonationInput(current, incoming) {
  if (!incoming || typeof incoming !== "object") {
    return current;
  }

  return {
    ...current,
    title: typeof incoming.title === "string" ? incoming.title : current.title,
    summary: typeof incoming.summary === "string" ? incoming.summary : current.summary,
    raised: Number.isFinite(Number(incoming.raised)) ? Number(incoming.raised) : current.raised,
    target: Number.isFinite(Number(incoming.target)) ? Number(incoming.target) : current.target,
    showTarget:
      typeof incoming.showTarget === "boolean" ? incoming.showTarget : current.showTarget,
    bankTransfer:
      incoming.bankTransfer && typeof incoming.bankTransfer === "object"
        ? {
            ...(current.bankTransfer || {}),
            bankName:
              typeof incoming.bankTransfer.bankName === "string"
                ? incoming.bankTransfer.bankName
                : current.bankTransfer?.bankName,
            accountName:
              typeof incoming.bankTransfer.accountName === "string"
                ? incoming.bankTransfer.accountName
                : current.bankTransfer?.accountName,
            accountNumber:
              typeof incoming.bankTransfer.accountNumber === "string"
                ? incoming.bankTransfer.accountNumber
                : current.bankTransfer?.accountNumber,
            note:
              typeof incoming.bankTransfer.note === "string"
                ? incoming.bankTransfer.note
                : current.bankTransfer?.note
          }
        : current.bankTransfer
  };
}

function sanitizePublicationsInput(current, incoming) {
  if (!Array.isArray(incoming)) {
    return current;
  }

  return incoming.map((item, index) => {
    const content = typeof item.content === "string" ? item.content : "";
    return {
      id: Number.isFinite(Number(item.id)) ? Number(item.id) : Date.now() + index,
      title: typeof item.title === "string" ? item.title : "",
      description: buildPublicationExcerpt(content),
      tag: typeof item.tag === "string" ? item.tag : "",
      content
    };
  });
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

function sendHtml(res, statusCode, html, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    ...headers
  });
  res.end(html);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    const maxBodySize = 5 * 1024 * 1024;

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxBodySize) {
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
        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        if (contentType.includes("application/json")) {
          resolve(JSON.parse(raw));
          return;
        }

        if (contentType.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams(raw);
          const next = {};
          for (const [key, value] of params.entries()) {
            next[key] = value;
          }
          resolve(next);
          return;
        }

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
    const isStaticAsset = [".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".ico"].includes(ext);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": isStaticAsset ? "public, max-age=3600" : "no-cache"
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
    sendJson(res, 200, await readCachedSiteData(), {
      "Cache-Control": "private, max-age=30"
    });
    return true;
  }

  if (pathname === "/api/public-site-data" && req.method === "GET") {
    const siteData = await readCachedSiteData();
    sendJson(res, 200, buildPublicSiteData(siteData), {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120"
    });
    return true;
  }

  if (pathname === "/api/publication" && req.method === "GET") {
    const publicationId = new URL(req.url, `http://${req.headers.host}`).searchParams.get("id");
    const siteData = await readCachedSiteData();
    const payload = buildPublicPublication(siteData, publicationId);

    if (!payload) {
      sendJson(res, 404, { error: "Publication not found." }, {
        "Cache-Control": "public, max-age=30"
      });
      return true;
    }

    sendJson(res, 200, payload, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120"
    });
    return true;
  }

  if (pathname === "/api/brand-avatar" && req.method === "GET") {
    const siteData = await readCachedSiteData();
    const avatarUrl = siteData.organization?.avatarUrl || "";
    const match = avatarUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!match) {
      sendText(res, 404, "Not Found");
      return true;
    }

    const mimeType = match[1];
    const bytes = Buffer.from(match[2], "base64");
    res.writeHead(200, {
      "Content-Type": mimeType,
      "Content-Length": bytes.length,
      "Cache-Control": "public, max-age=3600"
    });
    res.end(bytes);
    return true;
  }

  if (pathname === "/api/instagram-profile" && req.method === "GET") {
    const siteData = await readCachedSiteData();
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const fallbackInstagram = siteData.organization?.instagram || {};
    const requestedReference = requestUrl.searchParams.get("url")
      || requestUrl.searchParams.get("handle")
      || fallbackInstagram.url
      || fallbackInstagram.handle;
    const forceRefresh =
      requestUrl.searchParams.get("refresh") === "1" ||
      requestUrl.searchParams.get("refresh") === "true";

    try {
      const instagram = await fetchInstagramProfileStats(requestedReference, fallbackInstagram, {
        force: forceRefresh
      });
      sendJson(res, 200, { ok: true, instagram }, {
        "Cache-Control": "no-store"
      });
      return true;
    } catch {
      sendJson(res, 200, {
        ok: true,
        instagram: {
          handle: fallbackInstagram.handle || "@instagram",
          url: fallbackInstagram.url || "#",
          followers: fallbackInstagram.followers || "-",
          posts: fallbackInstagram.posts || "-",
          following: fallbackInstagram.following || "-",
          live: false
        }
      }, {
        "Cache-Control": "no-store"
      });
      return true;
    }
  }

  if (pathname === "/api/payments/ecpay/checkout" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const amount = Number(body.amount || 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        sendText(res, 400, "Invalid donation amount.");
        return true;
      }

      const { config, payload } = createEcpayDonationOrder(amount, req);
      const html = buildAutoSubmitFormHtml(config.checkoutUrl, payload);
      sendHtml(res, 200, html, {
        "Cache-Control": "no-store"
      });
      return true;
    } catch {
      sendText(res, 400, "Unable to create payment order.");
      return true;
    }
  }

  if (pathname === "/api/payments/ecpay/notify" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const config = getEcpayConfig();
      const receivedCheckMacValue = String(body.CheckMacValue || "").toUpperCase();
      const expectedCheckMacValue = computeEcpayCheckMacValue(body, config.hashKey, config.hashIV);

      if (!receivedCheckMacValue || receivedCheckMacValue !== expectedCheckMacValue) {
        sendText(res, 400, "CheckMacValue Error");
        return true;
      }

      sendText(res, 200, "1|OK");
      return true;
    } catch {
      sendText(res, 400, "Notification Error");
      return true;
    }
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
    } catch {
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

      const validationError = getAdminCredentialError(username, password);
      if (validationError) {
        sendJson(res, 400, { error: validationError });
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

      await store.writeAdmins(
        admins.sort((left, right) => left.username.localeCompare(right.username))
      );
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
    } catch {
      sendJson(res, 400, { error: "Unable to create admin account." });
      return true;
    }
  }

  if (pathname.startsWith("/api/admin/accounts/") && req.method === "DELETE") {
    const session = requireAuth(req, res);
    if (!session) {
      return true;
    }

    const username = decodeURIComponent(pathname.replace("/api/admin/accounts/", "")).trim();
    if (!username) {
      sendJson(res, 400, { error: "Username is required." });
      return true;
    }

    if (username === session.username) {
      sendJson(res, 400, { error: "You cannot delete the account you are currently using." });
      return true;
    }

    if (username === PRIMARY_ADMIN_USERNAME) {
      sendJson(res, 400, { error: "The primary admin account cannot be deleted." });
      return true;
    }

    const admins = await store.readAdmins();
    const nextAdmins = admins.filter((item) => item.username !== username);

    if (nextAdmins.length === admins.length) {
      sendJson(res, 404, { error: "Admin account not found." });
      return true;
    }

    if (nextAdmins.length === 0) {
      sendJson(res, 400, { error: "At least one admin account must remain." });
      return true;
    }

    await store.writeAdmins(nextAdmins);
    sendJson(res, 200, {
      ok: true,
      admins: nextAdmins
        .map((item) => ({
          username: item.username,
          createdAt: item.createdAt || null
        }))
        .sort((left, right) => left.username.localeCompare(right.username))
    });
    return true;
  }

  if (
    (pathname === "/api/admin/publications/import-instagram" ||
      pathname === "/api/admin/import-publication") &&
    req.method === "POST"
  ) {
    if (!requireAuth(req, res)) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const normalizedUrl = validateInstagramPostUrl(body.url);

      if (!normalizedUrl) {
        sendJson(res, 400, {
          error: "請提供有效的 Instagram 貼文或 Reels 網址。"
        });
        return true;
      }

      let html = "";
      let oembedData = null;
      const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(
        normalizedUrl
      )}`;

      try {
        html = await fetchRemoteText(normalizedUrl, { timeoutSeconds: 4 });
      } catch {
        html = "";
      }

      const extractedCaption = html ? extractInstagramCaptionFromHtml(html) : "";
      if (!extractedCaption) {
        try {
          oembedData = await fetchRemoteJson(oembedUrl, { timeoutSeconds: 2 });
        } catch {
          oembedData = null;
        }
      }
      if (!html && !oembedData) {
        sendJson(res, 422, {
          error: "目前無法讀取這則 Instagram 貼文，請確認網址是否公開可見。"
        });
        return true;
      }

      const publication = buildInstagramPublicationFromSources(normalizedUrl, html, oembedData);
      sendJson(res, 200, { ok: true, publication });
      return true;
    } catch {
      sendJson(res, 422, {
        error: "目前無法讀取這則 Instagram 貼文，請確認網址是否公開可見。"
      });
      return true;
    }
  }

  if (pathname === "/api/admin/site-data" && req.method === "PUT") {
    if (!requireAuth(req, res)) {
      return true;
    }

    try {
      const body = await parseBody(req);
      const current = await readCachedSiteData();
      const nextData = {
        ...current,
        organization: sanitizeOrganizationInput(current.organization, body.organization),
        donation: sanitizeDonationInput(current.donation, body.donation),
        publications: sanitizePublicationsInput(current.publications, body.publications)
      };

      await store.writeSiteData(nextData);
      invalidateSiteDataCache();
      sendJson(res, 200, nextData);
      return true;
    } catch {
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
