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
      title: "專刊 Vol.01｜社會建構如何影響我們理解世界",
      description:
        "從日常常見的性別、身份與規範出發，重新理解什麼是社會建構，以及它如何影響我們看待理所當然的事。",
      tag: "社會建構",
      content:
        "很多我們以為天生如此、理所當然的事情，其實都深受社會脈絡影響。\n\n理解社會建構，不是說一切都是假的，而是提醒我們：當下的規則與分類，往往是在歷史、文化與權力關係裡慢慢形成的。\n\n當我們看見這些形成過程，也就更有能力重新思考社會還能怎麼被安排。"
    }
  ]
};

function looksCorrupted(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return true;
  }

  return text.includes("�") || /\?[^\s]*\?/.test(text) || text.split("?").length > 3;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text || looksCorrupted(text)) {
    return fallback;
  }
  return text;
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
  const response = await fetch("/api/site-data");
  if (!response.ok) {
    throw new Error("Site data load failed");
  }

  const data = await response.json();
  const fallbackPublication =
    PUBLICATION_DEFAULTS.publications.find((item) => Number(item.id) === publicationId) ||
    PUBLICATION_DEFAULTS.publications[0];
  const publication = (data.publications || []).find((item) => Number(item.id) === publicationId) || fallbackPublication;

  applyBranding(data.organization || PUBLICATION_DEFAULTS.organization);

  if (!publication) {
    document.getElementById("publication-title").textContent = "找不到這篇刊物";
    document.getElementById("publication-tag").classList.add("hidden");
    document.getElementById("publication-description").textContent = "這篇刊物可能已被移除，或連結有誤。";
    document.getElementById("publication-content").innerHTML = "";
    return;
  }

  const title = sanitizeText(publication.title, fallbackPublication.title);
  const description = sanitizeText(publication.description, fallbackPublication.description);
  const tagText = sanitizeText(publication.tag, fallbackPublication.tag);
  const content = sanitizeText(publication.content, fallbackPublication.content);
  const orgName = sanitizeText(data.organization?.name, PUBLICATION_DEFAULTS.organization.name);

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
  document.getElementById("publication-title").textContent = "刊物讀取失敗";
  document.getElementById("publication-description").textContent = "請稍後再試一次。";
});
