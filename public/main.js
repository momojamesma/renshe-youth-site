function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function renderHighlights(items) {
  const container = document.getElementById("highlight-list");
  container.innerHTML = items
    .map(
      (item, index) => `
        <article>
          <p class="panel-label">Focus 0${index + 1}</p>
          <h3>${item}</h3>
          <p>從青年視角出發，把複雜議題整理成更容易理解、也更值得延伸討論的內容。</p>
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

function renderBankTransfer(bankTransfer) {
  const card = document.getElementById("bank-transfer-card");
  if (!bankTransfer || !bankTransfer.bankName || !bankTransfer.accountNumber) {
    card.classList.add("hidden");
    return;
  }

  document.getElementById("transfer-bank-name").textContent = bankTransfer.bankName;
  document.getElementById("transfer-account-name").textContent = bankTransfer.accountName || "-";
  document.getElementById("transfer-account-number").textContent = bankTransfer.accountNumber;
  document.getElementById("transfer-note").textContent = bankTransfer.note || "";
  card.classList.remove("hidden");
}

function renderDonation(donation) {
  const targetAmount = document.getElementById("target-amount");
  const progressCaption = document.getElementById("progress-caption");
  const raised = Number(donation.raised) || 0;
  const target = Number(donation.target) || 0;
  const showTarget = donation.showTarget !== false;

  document.getElementById("donation-title").textContent = donation.title;
  document.getElementById("donation-summary").textContent = donation.summary;
  document.getElementById("raised-amount").textContent = formatCurrency(raised);

  if (showTarget && target > 0) {
    const progress = Math.min((raised / target) * 100, 100);
    targetAmount.textContent = `/ ${formatCurrency(target)}`;
    targetAmount.classList.remove("hidden");
    document.getElementById("progress-bar").style.width = `${progress}%`;
    progressCaption.textContent = `目前已達成 ${Math.round(progress)}%`;
  } else {
    targetAmount.textContent = "";
    targetAmount.classList.add("hidden");
    document.getElementById("progress-bar").style.width = "100%";
    progressCaption.textContent = "目前顯示累積募得金額";
  }

  const list = document.getElementById("donation-accounts");
  list.innerHTML = (donation.accounts || []).map((item) => `<li>${item}</li>`).join("");

  renderBankTransfer(donation.bankTransfer);
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
  const target = Number(data.donation.target) || 0;
  const raised = Number(data.donation.raised) || 0;
  const progress =
    data.donation.showTarget !== false && target > 0 ? Math.round((raised / target) * 100) : null;

  const stats = [
    { value: `${data.organization.themes?.length || 0}+`, label: "追蹤核心議題" },
    { value: `${data.publications.length}`, label: "專刊與長文整理" },
    {
      value: progress === null ? formatCurrency(raised) : `${progress}%`,
      label: progress === null ? "目前累積募得" : "募款進度"
    }
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
  renderHighlights(data.organization.highlights || []);
  renderDonation(data.donation || {});
  renderPublications(data.publications || []);
  renderAbout(data.organization.about || []);
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
  document.getElementById("hero-mission").textContent = "網站資料暫時無法載入，請稍後再試。";
});
