function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
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

function renderHighlights(items) {
  const container = document.getElementById("highlight-list");
  container.innerHTML = items
    .map(
      (item, index) => `
        <article>
          <p class="panel-label">Focus 0${index + 1}</p>
          <h3>${item}</h3>
          <p>從青年視角整理議題脈絡，讓人文社會討論更容易被閱讀、分享與參與。</p>
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
    progressCaption.textContent = `已達成 ${Math.round(progress)}%`;
  } else {
    targetAmount.textContent = "";
    targetAmount.classList.add("hidden");
    progressBar.style.width = "100%";
    progressCaption.textContent = "目前以前台顯示募得金額為主。";
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
          <p>${item.description || ""}</p>
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

  const handle = String(instagram.handle || "").trim();
  const normalizedHandle = handle.replace(/^@+/, "");
  const profileUrl = instagram.url || (normalizedHandle ? `https://www.instagram.com/${normalizedHandle}/` : "#");

  document.getElementById("ig-followers").textContent = instagram.followers || "-";
  document.getElementById("ig-posts").textContent = instagram.posts || "-";
  document.getElementById("ig-following").textContent = instagram.following || "-";
  document.getElementById("ig-link").href = profileUrl;
  document.getElementById("ig-link").textContent = `${handle || "@instagram"} 前往 Instagram`;
}

async function refreshInstagramStats(instagram) {
  if (!instagram) {
    return;
  }

  const params = new URLSearchParams();
  if (instagram.url) {
    params.set("url", instagram.url);
  } else if (instagram.handle) {
    params.set("handle", instagram.handle);
  }

  const response = await fetch(`/api/instagram-profile?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Instagram stats load failed");
  }

  const payload = await response.json();
  if (payload?.instagram) {
    renderInstagram({
      ...instagram,
      ...payload.instagram
    });
  }
}

function renderHeroStats(data) {
  const container = document.getElementById("hero-stats");
  const target = Number(data.donation?.target) || 0;
  const raised = Number(data.donation?.raised) || 0;
  const progress =
    data.donation?.showTarget !== false && target > 0 ? Math.round((raised / target) * 100) : null;

  const stats = [
    { value: `${data.organization?.themes?.length || 0}+`, label: "關注議題" },
    { value: `${data.publications?.length || 0}`, label: "刊物篇數" },
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
  if (!response.ok) {
    throw new Error("Site data load failed");
  }

  const data = await response.json();

  applyBranding(data.organization || {});
  document.getElementById("hero-title").textContent =
    data.organization?.tagline || "用學生的眼光看人社，用人社的視角看社會";
  document.getElementById("hero-mission").textContent = data.organization?.mission || "";

  renderThemes(data.organization?.themes || []);
  renderHeroStats(data);
  renderHighlights(data.organization?.highlights || []);
  renderDonation(data.donation || {});
  renderPublications(data.publications || []);
  renderAbout(data.organization?.about || []);
  renderInstagram(data.organization?.instagram);
  refreshInstagramStats(data.organization?.instagram).catch(() => {});
}

function bindMobileMenu() {
  const toggle = document.querySelector(".mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) {
    return;
  }

  const links = menu.querySelectorAll("a");
  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("open");
    document.body.classList.remove("menu-open");
  };

  const setMenuState = (expanded) => {
    toggle.setAttribute("aria-expanded", String(expanded));
    menu.classList.toggle("open", expanded);
    document.body.classList.toggle("menu-open", expanded);
  };

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    setMenuState(!expanded);
  });

  links.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("open")) {
      return;
    }

    if (menu.contains(event.target) || toggle.contains(event.target)) {
      return;
    }

    closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeMenu();
    }
  });
}

bindMobileMenu();
loadSite().catch(() => {
  document.getElementById("hero-mission").textContent = "目前無法載入網站資料，請稍後再試。";
});
