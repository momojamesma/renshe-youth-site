function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(value);
}

function renderHighlights(items) {
  const container = document.getElementById("highlight-list");
  container.innerHTML = items
    .map(
      (item, index) => `
        <article>
          <p class="panel-label">Focus 0${index + 1}</p>
          <h3>${item}</h3>
          <p>把複雜概念變成青年可以閱讀、討論，並帶回公共現場的知識內容。</p>
        </article>
      `
    )
    .join("");
}

function renderThemes(items) {
  const container = document.getElementById("theme-list");
  container.innerHTML = items.map((item) => `<span class="theme-pill">${item}</span>`).join("");
}

function renderAbout(paragraphs) {
  const container = document.getElementById("about-list");
  container.innerHTML = paragraphs.map((text) => `<p>${text}</p>`).join("");
}

function renderDonation(donation) {
  document.getElementById("donation-title").textContent = donation.title;
  document.getElementById("donation-summary").textContent = donation.summary;
  document.getElementById("raised-amount").textContent = formatCurrency(donation.raised);
  document.getElementById("target-amount").textContent = `/ ${formatCurrency(donation.target)}`;

  const list = document.getElementById("donation-accounts");
  list.innerHTML = donation.accounts.map((item) => `<li>${item}</li>`).join("");

  const progress = donation.target > 0 ? Math.min((donation.raised / donation.target) * 100, 100) : 0;
  document.getElementById("progress-bar").style.width = `${progress}%`;
  document.getElementById("progress-caption").textContent = `目前已達成 ${Math.round(progress)}%`;
}

function renderPublications(items) {
  const container = document.getElementById("publication-list");
  container.innerHTML = items
    .map(
      (item) => `
        <article class="publication-item">
          <header>
            <div>
              <p class="panel-label">${item.issue}</p>
              <h3>${item.title}</h3>
            </div>
            <div class="publication-meta">
              ${item.tag ? `<span class="topic-pill">${item.tag}</span>` : ""}
              <span class="status-pill">${item.status}</span>
            </div>
          </header>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

function renderInstagram(instagram) {
  if (!instagram) {
    return;
  }

  document.getElementById("ig-followers").textContent = instagram.followers;
  document.getElementById("ig-posts").textContent = instagram.posts;
  document.getElementById("ig-following").textContent = instagram.following;
  document.getElementById("ig-link").href = instagram.url;
  document.getElementById("ig-link").textContent = `${instagram.handle} 的內容現場`;
}

function renderHeroStats(data) {
  const container = document.getElementById("hero-stats");
  const progress = data.donation.target > 0 ? Math.round((data.donation.raised / data.donation.target) * 100) : 0;

  const stats = [
    { value: `${data.organization.themes?.length || 0}+`, label: "追蹤核心議題" },
    { value: `${data.publications.length}`, label: "專刊與長文整理" },
    { value: `${progress}%`, label: "募款目前進度" }
  ];

  container.innerHTML = stats
    .map(
      (item) => `
        <article>
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </article>
      `
    )
    .join("");
}

async function loadSite() {
  const response = await fetch("/api/site-data");
  const data = await response.json();

  document.getElementById("hero-title").textContent = data.organization.tagline;
  document.getElementById("hero-mission").textContent = data.organization.mission;

  renderThemes(data.organization.themes || []);
  renderHeroStats(data);
  renderHighlights(data.organization.highlights);
  renderDonation(data.donation);
  renderPublications(data.publications);
  renderAbout(data.organization.about);
  renderInstagram(data.organization.instagram);
}

function bindMobileMenu() {
  const toggle = document.querySelector(".mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  const links = menu.querySelectorAll("a");

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.classList.toggle("open");
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      menu.classList.remove("open");
    });
  });
}

bindMobileMenu();
loadSite().catch(() => {
  document.getElementById("hero-mission").textContent = "網站資料載入失敗，請稍後再試。";
});
