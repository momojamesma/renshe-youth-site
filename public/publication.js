const DEFAULT_SECTION_COLORS = {
  header: "#f5f1e8",
  publications: "#f8f3ec"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getContrastColor(hexColor, light = "#fffdf8", dark = "#203039") {
  if (!hexColor || !/^#([0-9a-f]{6})$/i.test(hexColor)) {
    return dark;
  }

  const normalized = hexColor.slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness < 150 ? light : dark;
}

function applyBranding(organization) {
  const avatar = document.getElementById("brand-avatar");
  const markText = document.getElementById("brand-mark-text");
  const brandName = document.getElementById("brand-name");
  const brandMarkText = organization?.appearance?.brandMarkText?.trim() || "RY";

  brandName.textContent = organization?.name || "人社青年";
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

function applySectionColors(organization) {
  const sectionColors = {
    ...DEFAULT_SECTION_COLORS,
    ...(organization?.appearance?.sectionColors || {})
  };

  const themeMap = {
    header: document.querySelector(".theme-header"),
    publications: document.querySelector(".theme-publications")
  };

  Object.entries(themeMap).forEach(([key, element]) => {
    if (!element) {
      return;
    }

    const color = sectionColors[key] || DEFAULT_SECTION_COLORS[key];
    element.style.setProperty("--section-bg", color);
    element.style.setProperty("--section-text", getContrastColor(color));
  });
}

function getPublicationId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function renderContent(content) {
  const container = document.getElementById("publication-content");
  const paragraphs = String(content || "")
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean);

  container.innerHTML = paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("");
}

async function loadPublication() {
  const publicationId = getPublicationId();
  const response = await fetch("/api/site-data");
  const data = await response.json();
  const publication = (data.publications || []).find((item) => Number(item.id) === publicationId);

  applyBranding(data.organization || {});
  applySectionColors(data.organization || {});

  if (!publication) {
    document.getElementById("publication-title").textContent = "找不到這篇刊物";
    document.getElementById("publication-tag").classList.add("hidden");
    document.getElementById("publication-description").textContent = "這篇內容可能已被移除，或網址有誤。";
    document.getElementById("publication-content").innerHTML = "";
    return;
  }

  document.title = `${publication.title} | ${data.organization?.name || "人社青年"}`;
  document.getElementById("publication-title").textContent = publication.title;
  document.getElementById("publication-description").textContent = publication.description || "";

  const tag = document.getElementById("publication-tag");
  if (publication.tag) {
    tag.textContent = publication.tag;
    tag.classList.remove("hidden");
  } else {
    tag.classList.add("hidden");
  }

  renderContent(publication.content);
}

loadPublication().catch(() => {
  document.getElementById("publication-title").textContent = "刊物資料載入失敗";
  document.getElementById("publication-description").textContent = "請稍後再試。";
});
