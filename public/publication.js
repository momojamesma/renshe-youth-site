function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

  if (!publication) {
    document.getElementById("publication-title").textContent = "找不到這篇刊物";
    document.getElementById("publication-tag").classList.add("hidden");
    document.getElementById("publication-description").textContent = "這篇文章可能已被移除，或網址有誤。";
    document.getElementById("publication-content").innerHTML = "";
    return;
  }

  document.title = `${publication.title} | 人社青年`;
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
  document.getElementById("publication-title").textContent = "刊物載入失敗";
  document.getElementById("publication-description").textContent = "請稍後再試。";
});
