function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  const publication = (data.publications || []).find((item) => Number(item.id) === publicationId);

  applyBranding(data.organization || {});

  if (!publication) {
    document.getElementById("publication-title").textContent = "找不到這篇刊物";
    document.getElementById("publication-tag").classList.add("hidden");
    document.getElementById("publication-description").textContent = "刊物可能已被移除，請返回列表重新查看。";
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
