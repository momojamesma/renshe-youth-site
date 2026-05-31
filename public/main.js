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
          <p>從青年視角出發，把抽象議題拆成可理解、可討論、可參與的公共內容。</p>
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
  const progressBar = document.getElementById("progress-bar");
  const raised = Number(donation.raised) || 0;
  const target = Number(donation.target) || 0;
  const showTarget = donation.showTarget !== false;

  document.getElementById("donation-title").textContent = donation.title || "支持人社青年";
  document.getElementById("donation-summary").textContent = donation.summary || "";
  document.getElementById("raised-amount").textContent = formatCurrency(raised);

  if (showTarget && target > 0) {
    const progress = Math.min((raised / target) * 100, 100);
    targetAmount.textContent = `/ ${formatCurrency(target)}`;
    targetAmount.classList.remove("hidden");
    progressBar.style.width = `${progress}%`;
    progressCaption.textContent = `目前已達成 ${Math.round(progress)}%`;
  } else {
    targetAmount.textContent = "";
    targetAmount.classList.add("hidden");
    progressBar.style.width = "100%";
    progressCaption.textContent = "目前顯示已募得金額";
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
              <h3>${item.title}</h3>
            </div>
            <div class="publication-meta">
              ${item.tag ? `<span class="topic-pill">${item.tag}</span>` : ""}
            </div>
          </header>
          <p>${item.description}</p>
          <a class="inline-link publication-link" href="/publication.html?id=${item.id}">閱讀完整刊物</a>
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
  document.getElementById("ig-link").textContent = `${instagram.handle} 前往 Instagram`;
}

function renderHeroStats(data) {
  const container = document.getElementById("hero-stats");
  const target = Number(data.donation?.target) || 0;
  const raised = Number(data.donation?.raised) || 0;
  const progress =
    data.donation?.showTarget !== false && target > 0 ? Math.round((raised / target) * 100) : null;

  const stats = [
    { value: `${data.organization?.themes?.length || 0}+`, label: "關注議題" },
    { value: `${data.publications?.length || 0}`, label: "刊物與文章" },
    {
      value: progress === null ? formatCurrency(raised) : `${progress}%`,
      label: progress === null ? "目前募得" : "募款進度"
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
