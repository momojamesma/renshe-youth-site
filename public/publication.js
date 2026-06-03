const PUBLICATION_DEFAULTS = {
  organization: {
    name: "人社青年",
    appearance: {
      brandMarkText: "RY"
    }
  },
  publications: [
    {
      id: 1,
      title: "當我們談社會建構，我們在談什麼？",
      tag: "社會建構",
      content:
        "這篇刊物從社會建構論切入，討論我們習以為常的分類與價值判準，是如何在歷史、文化與制度的交互作用下被建立起來。當我們重新看待這些規則，就更能理解公共議題中的衝突，並看見改變的可能。"
    },
    {
      id: 2,
      title: "特權不是標籤，而是理解不平等的入口",
      tag: "不平等",
      content:
        "當我們談特權，不是為了簡化每個人的生命經驗，而是為了看見制度與社會位置如何影響選擇。這篇文章試著把特權從道德指責中抽離，回到公共討論本身，讓我們更有能力理解不平等。"
    },
    {
      id: 3,
      title: "自由、秩序與討論空間：青年如何面對公共爭議",
      tag: "公共討論",
      content:
        "在快速對立的時代，真正困難的往往不是表態，而是留下討論的空間。這篇刊物想談的是，當青年面對公共爭議時，如何同時理解自由、秩序與責任之間的張力，並在現場保持思辨能力。"
    },
    {
      id: 4,
      title: "從制度觀看事件：為什麼我們需要更慢的理解",
      tag: "制度觀察",
      content:
        "一則新聞不會只是一則新聞。它總是連著制度、資源、媒體與社會想像。這篇文章邀請讀者把目光從單一事件拉遠，練習用更慢的速度理解複雜社會，避免讓討論停在表面。"
    }
  ]
};

function isCorruptedText(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return true;
  }

  const suspiciousTokens = ["鈭", "嚗", "", "", "�", "??", "?", "?", "?舀"];
  if (suspiciousTokens.some((token) => text.includes(token))) {
    return true;
  }

  if (!text.includes("http") && text.split("?").length > 3) {
    return true;
  }

  return false;
}

function sanitizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text || isCorruptedText(text)) {
    return fallback;
  }
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildPublicationExcerpt(text, limit = 50) {
  const normalized = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= limit) {
    return normalized;
  }

  const remainder = normalized.slice(limit);
  const punctuationMatch = remainder.match(/[。！？.!?]/);
  if (punctuationMatch && Number.isFinite(punctuationMatch.index)) {
    const stopIndex = limit + punctuationMatch.index + 1;
    if (stopIndex <= limit + 16) {
      return `${normalized.slice(0, stopIndex).trim()}…`;
    }
  }

  return `${normalized.slice(0, limit).trim()}…`;
}

function applyBranding(organization) {
  const avatar = document.getElementById("brand-avatar");
  const markText = document.getElementById("brand-mark-text");
  const brandName = document.getElementById("brand-name");
  const brandMarkText = sanitizeText(organization?.appearance?.brandMarkText, "RY");

  brandName.textContent = sanitizeText(organization?.name, PUBLICATION_DEFAULTS.organization.name);
  markText.textContent = brandMarkText;

  if (organization?.avatarUrl) {
    avatar.src = organization.avatarUrl;
    avatar.classList.remove("hidden");
    markText.classList.add("hidden");
  } else {
    avatar.removeAttribute("src");
    avatar.classList.add("hidden");
    markText.classList.remove("hidden");
  }
}

function getPublicationId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function renderContent(content) {
  const container = document.getElementById("publication-content");
  const blocks = String(content || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean);

  container.innerHTML = blocks
    .map((text) => `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

async function loadPublication() {
  const publicationId = getPublicationId();
  const fallbackPublication =
    PUBLICATION_DEFAULTS.publications.find((item) => Number(item.id) === publicationId)
    || PUBLICATION_DEFAULTS.publications[0];

  let payload = null;
  const response = await fetch(`/api/publication?id=${encodeURIComponent(publicationId)}`, {
    cache: "no-store"
  });

  if (response.ok) {
    payload = await response.json();
  } else if (response.status === 404) {
    payload = {
      organization: PUBLICATION_DEFAULTS.organization,
      publication: fallbackPublication
    };
  } else {
    throw new Error("Publication load failed");
  }

  const organization = payload.organization || PUBLICATION_DEFAULTS.organization;
  const publication = payload.publication || fallbackPublication;

  applyBranding(organization);

  const title = sanitizeText(publication.title, fallbackPublication.title);
  const tagText = sanitizeText(publication.tag, fallbackPublication.tag);
  const content = sanitizeText(publication.content, fallbackPublication.content);
  const description = buildPublicationExcerpt(content, 50);
  const orgName = sanitizeText(organization.name, PUBLICATION_DEFAULTS.organization.name);

  document.title = `${title} | ${orgName}`;
  document.getElementById("publication-title").textContent = title;
  document.getElementById("publication-description").textContent = description;

  const tag = document.getElementById("publication-tag");
  if (tagText) {
    tag.textContent = tagText;
    tag.classList.remove("hidden");
  } else {
    tag.classList.add("hidden");
  }

  renderContent(content);
}

loadPublication().catch(() => {
  applyBranding(PUBLICATION_DEFAULTS.organization);
  document.getElementById("publication-title").textContent = "刊物載入失敗";
  document.getElementById("publication-description").textContent = "請稍後重新整理頁面，或回到刊物列表再試一次。";
  renderContent(PUBLICATION_DEFAULTS.publications[0].content);
});
