const DEFAULT_CONTENT = {
  organization: {
    name: "人社青年",
    tagline: "用學生的眼光看人社，用人社的視角看社會",
    mission:
      "人社青年是一個由高中生與大學生共同維護的平台，持續整理社會建構、特權、不平等、轉型正義與公共討論等主題，讓抽象概念可以被更多青年真正讀懂。",
    instagram: {
      handle: "@youth.hss",
      url: "https://www.instagram.com/youth.hss/",
      followers: "1,486",
      posts: "93",
      following: "58"
    },
    themes: ["社會建構", "特權與不平等", "自由與霸權", "轉型正義"],
    highlights: [
      "把原本散在新聞、社群與課堂裡的概念重新整理成可閱讀內容。",
      "用青年視角處理複雜議題，但不把內容寫成只有立場、沒有脈絡。",
      "從貼文延伸到長文刊物，讓讀者可以從快速理解走向完整閱讀。"
    ],
    about: [
      "我們不是大型媒體，也不是智庫。人社青年更像是一個持續整理議題的青年內容團隊，透過寫作把零散資訊變成有脈絡的知識。",
      "從 Instagram 貼文到網站刊物，我們關心的不只是能不能被看見，而是內容能不能真的幫助讀者理解制度、概念與爭點。",
      "這個網站保留了比社群貼文更長的閱讀空間，也保留一種比較慢的節奏，讓公共議題不只停在轉貼與表態。"
    ],
    appearance: {
      brandMarkText: "RY"
    }
  },
  donation: {
    title: "支持人社青年",
    summary:
      "你的支持會直接用在內容整理、刊物撰寫、設計製作與網站維運。對青年團隊來說，穩定更新不是理所當然，而是需要時間、勞力與資源一起撐起來。",
    showTarget: false,
    target: 500000,
    raised: 186400,
    accounts: [
      "支持網站刊物、社群貼文與議題整理持續更新。",
      "支持青年團隊投入公共議題研究、寫作與編輯工作。",
      "支持一個可以讓人慢慢理解社會，而不是只快速表態的平台。"
    ],
    bankTransfer: {
      bankName: "郵局",
      accountName: "人社青年",
      accountNumber: "00310530676964",
      note: "匯款完成後，歡迎透過 Instagram 私訊告知，以利後續核對。"
    }
  },
  paymentGateway: {
    provider: "ecpay",
    enabled: true,
    sandbox: true,
    checkoutPath: "/api/payments/ecpay/checkout",
    methods: ["信用卡", "ATM", "超商代碼", "超商條碼"],
    publicNote: ""
  },
  publications: [
    {
      id: 1,
      title: "當我們談社會建構，我們在談什麼？",
      tag: "社會建構",
      description: "從分類、規範與日常語言出發，重新理解社會規則如何被建立。",
      content:
        "這篇刊物從社會建構論切入，討論我們習以為常的分類與價值判準，是如何在歷史、文化與制度的交互作用下被建立起來。當我們重新看待這些規則，就更能理解公共議題中的衝突，並看見改變的可能。"
    },
    {
      id: 2,
      title: "特權不是標籤，而是理解不平等的入口",
      tag: "不平等",
      description: "從性別、教育資源與社會位置出發，理解特權如何影響每個人的處境。",
      content:
        "當我們談特權，不是為了簡化每個人的生命經驗，而是為了看見制度與社會位置如何影響選擇。這篇文章試著把特權從道德指責中抽離，回到公共討論本身，讓我們更有能力理解不平等。"
    },
    {
      id: 3,
      title: "自由、秩序與討論空間：青年如何面對公共爭議",
      tag: "公共討論",
      description: "在快速對立的時代，保留討論空間比表態更困難，也更重要。",
      content:
        "在快速對立的時代，真正困難的往往不是表態，而是留下討論的空間。這篇刊物想談的是，當青年面對公共爭議時，如何同時理解自由、秩序與責任之間的張力，並在現場保持思辨能力。"
    },
    {
      id: 4,
      title: "從制度觀看事件：為什麼我們需要更慢的理解",
      tag: "制度觀察",
      description: "重大事件發生後，除了情緒反應，我們還能如何更完整地理解社會。",
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

  return !text.includes("http") && text.split("?").length > 3;
}

function sanitizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text || isCorruptedText(text)) {
    return fallback;
  }
  return text;
}

function sanitizeList(items, fallback = []) {
  if (!Array.isArray(items)) {
    return fallback;
  }

  const cleaned = items
    .map((item, index) => sanitizeText(item, fallback[index] || ""))
    .filter(Boolean);

  return cleaned.length ? cleaned : fallback;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
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

function normalizePublication(item, fallback, index) {
  const base = fallback || DEFAULT_CONTENT.publications[index] || DEFAULT_CONTENT.publications[0];
  const title = sanitizeText(item?.title, base.title);
  const tag = sanitizeText(item?.tag, base.tag);
  const descriptionSource =
    sanitizeText(item?.description) || sanitizeText(item?.content) || base.content || base.description;

  return {
    id: Number(item?.id) || base.id,
    title,
    tag,
    description: buildPublicationExcerpt(descriptionSource, 50)
  };
}

function applyBranding(organization) {
  const avatar = document.getElementById("brand-avatar");
  const markText = document.getElementById("brand-mark-text");
  const brandName = document.getElementById("brand-name");
  const brandMarkText = sanitizeText(organization?.appearance?.brandMarkText, "RY");

  brandName.textContent = sanitizeText(organization?.name, DEFAULT_CONTENT.organization.name);
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

function renderHero(organization) {
  document.title = sanitizeText(organization?.name, DEFAULT_CONTENT.organization.name);
  document.getElementById("hero-title").textContent = sanitizeText(
    organization?.tagline,
    DEFAULT_CONTENT.organization.tagline
  );
  document.getElementById("hero-mission").textContent = sanitizeText(
    organization?.mission,
    DEFAULT_CONTENT.organization.mission
  );
}

function renderThemes(items) {
  const container = document.getElementById("theme-list");
  const themes = sanitizeList(items, DEFAULT_CONTENT.organization.themes).slice(0, 4);
  container.innerHTML = themes.map((item) => `<span class="theme-pill">${item}</span>`).join("");
}

function renderHeroStats(publicationsCount) {
  const container = document.getElementById("hero-stats");
  const count = Number(publicationsCount) || DEFAULT_CONTENT.publications.length;
  const items = [
    { value: "青年視角", label: "內容切入" },
    { value: `${count} 篇`, label: "網站刊物" },
    { value: "長文整理", label: "閱讀形式" }
  ];

  container.innerHTML = items
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

function renderHighlights(items) {
  const container = document.getElementById("highlight-list");
  const list = sanitizeList(items, DEFAULT_CONTENT.organization.highlights);
  container.innerHTML = list
    .map(
      (item, index) => `
        <article>
          <p class="panel-label">0${index + 1}</p>
          <h3>${item}</h3>
          <p>我們試著把概念放回真實事件、制度背景與青年經驗裡，讓文章不是只有立場，而是能夠真的幫助閱讀者理解。</p>
        </article>
      `
    )
    .join("");
}

function renderAbout(paragraphs) {
  const container = document.getElementById("about-list");
  const list = sanitizeList(paragraphs, DEFAULT_CONTENT.organization.about);
  container.innerHTML = list.map((text) => `<p>${text}</p>`).join("");
}

function renderInstagram(instagram) {
  const source = instagram || DEFAULT_CONTENT.organization.instagram;
  const handle = sanitizeText(source.handle, DEFAULT_CONTENT.organization.instagram.handle);
  const normalizedHandle = handle.replace(/^@+/, "");
  const profileUrl =
    sanitizeText(source.url) ||
    (normalizedHandle ? `https://www.instagram.com/${normalizedHandle}/` : "#");

  document.getElementById("ig-followers").textContent = sanitizeText(
    source.followers,
    DEFAULT_CONTENT.organization.instagram.followers
  );
  document.getElementById("ig-posts").textContent = sanitizeText(
    source.posts,
    DEFAULT_CONTENT.organization.instagram.posts
  );
  document.getElementById("ig-following").textContent = sanitizeText(
    source.following,
    DEFAULT_CONTENT.organization.instagram.following
  );

  const linkTargets = ["ig-link", "footer-ig-link"];
  linkTargets.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.href = profileUrl;
      if (id === "footer-ig-link") {
        element.textContent = handle.startsWith("@") ? handle : `@${normalizedHandle}`;
      }
    }
  });
}

async function refreshInstagramStats(organization, force = false) {
  const fallbackInstagram = organization?.instagram || DEFAULT_CONTENT.organization.instagram;
  const params = new URLSearchParams();

  if (fallbackInstagram.url) {
    params.set("url", fallbackInstagram.url);
  } else if (fallbackInstagram.handle) {
    params.set("handle", fallbackInstagram.handle.replace(/^@+/, ""));
  }

  if (force) {
    params.set("refresh", "1");
  }

  const response = await fetch(`/api/instagram-profile?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Instagram stats load failed");
  }

  const data = await response.json();
  if (data?.instagram) {
    renderInstagram(data.instagram);
  }
}

function renderBankTransfer(bankTransfer) {
  const card = document.getElementById("bank-transfer-card");
  const bankName = sanitizeText(bankTransfer?.bankName, DEFAULT_CONTENT.donation.bankTransfer.bankName);
  const accountName = sanitizeText(
    bankTransfer?.accountName,
    DEFAULT_CONTENT.donation.bankTransfer.accountName
  );
  const accountNumber = sanitizeText(
    bankTransfer?.accountNumber,
    DEFAULT_CONTENT.donation.bankTransfer.accountNumber
  );
  const note = sanitizeText(bankTransfer?.note, DEFAULT_CONTENT.donation.bankTransfer.note);

  if (!bankName || !accountNumber) {
    card.classList.add("hidden");
    return;
  }

  document.getElementById("transfer-bank-name").textContent = bankName;
  document.getElementById("transfer-account-name").textContent = accountName;
  document.getElementById("transfer-account-number").textContent = accountNumber;
  document.getElementById("transfer-note").textContent = note;
  card.classList.remove("hidden");
}

function renderDonation(donation) {
  const data = donation || DEFAULT_CONTENT.donation;
  const targetAmount = document.getElementById("target-amount");
  const progressCaption = document.getElementById("progress-caption");
  const progressBar = document.getElementById("progress-bar");
  const raised = Number(data?.raised) || DEFAULT_CONTENT.donation.raised;
  const target = Number(data?.target) || DEFAULT_CONTENT.donation.target;
  const showTarget = data?.showTarget === true;

  document.getElementById("donation-title").textContent = sanitizeText(data?.title, DEFAULT_CONTENT.donation.title);
  document.getElementById("donation-summary").textContent = sanitizeText(
    data?.summary,
    DEFAULT_CONTENT.donation.summary
  );
  document.getElementById("raised-amount").textContent = formatCurrency(raised);

  if (showTarget && target > 0) {
    const progress = Math.min((raised / target) * 100, 100);
    targetAmount.textContent = `/ ${formatCurrency(target)}`;
    targetAmount.classList.remove("hidden");
    progressBar.style.width = `${progress}%`;
    progressCaption.textContent = `目前達成 ${Math.round(progress)}%`;
    progressCaption.classList.remove("hidden");
  } else {
    targetAmount.textContent = "";
    targetAmount.classList.add("hidden");
    progressBar.style.width = "100%";
    progressCaption.textContent = "";
    progressCaption.classList.add("hidden");
  }

  const list = document.getElementById("donation-accounts");
  const accounts = sanitizeList(data?.accounts, DEFAULT_CONTENT.donation.accounts);
  list.innerHTML = accounts.map((item) => `<li>${item}</li>`).join("");

  renderBankTransfer(data?.bankTransfer || DEFAULT_CONTENT.donation.bankTransfer);
}

function renderPaymentGateway(paymentGateway) {
  const config = paymentGateway || DEFAULT_CONTENT.paymentGateway;
  const form = document.getElementById("payment-form");
  const note = document.getElementById("payment-gateway-note");
  const submitButton = document.getElementById("payment-submit-button");

  form.action = config.checkoutPath || DEFAULT_CONTENT.paymentGateway.checkoutPath;

  if (!config.enabled) {
    submitButton.disabled = true;
    note.textContent = "目前暫停第三方付款，若仍想支持我們，可改用匯款方式。";
    return;
  }

  submitButton.disabled = false;

  if (sanitizeText(config.publicNote)) {
    note.textContent = sanitizeText(config.publicNote);
    return;
  }

  note.textContent = config.sandbox
    ? "目前串接的是測試付款流程，送出後會前往第三方測試頁。"
    : `第三方付款支援 ${config.methods.join("、")}。`;
}

function renderPublications(items) {
  const container = document.getElementById("publication-list");
  const source = Array.isArray(items) && items.length ? items : DEFAULT_CONTENT.publications;

  container.innerHTML = source
    .map((item, index) => {
      const publication = normalizePublication(item, DEFAULT_CONTENT.publications[index], index);
      return `
        <article class="publication-item">
          <header>
            <div>
              <h3>${publication.title}</h3>
            </div>
            <div class="publication-meta">
              ${publication.tag ? `<span class="topic-pill">${publication.tag}</span>` : ""}
            </div>
          </header>
          <p>${publication.description}</p>
          <a class="inline-link publication-link" href="/publication.html?id=${publication.id}">閱讀完整刊物</a>
        </article>
      `;
    })
    .join("");
}

function setSelectedDonationAmount(amount) {
  const amountInput = document.getElementById("payment-amount-input");
  const presets = Array.from(document.querySelectorAll(".donation-preset"));
  amountInput.value = amount;
  presets.forEach((button) => {
    button.classList.toggle("active", String(button.dataset.amount) === String(amount));
  });
}

function initDonationPresets() {
  const presets = Array.from(document.querySelectorAll(".donation-preset"));
  const amountInput = document.getElementById("payment-amount-input");
  const form = document.getElementById("payment-form");

  presets.forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedDonationAmount(button.dataset.amount || "");
    });
  });

  amountInput.addEventListener("input", () => {
    presets.forEach((button) => {
      button.classList.toggle("active", String(button.dataset.amount) === String(amountInput.value));
    });
  });

  form.addEventListener("submit", (event) => {
    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      event.preventDefault();
      amountInput.focus();
    }
  });
}

function initMobileMenu() {
  const toggle = document.querySelector(".mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) {
    return;
  }

  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("open");
    document.body.classList.remove("menu-open");
  }

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.classList.toggle("open", !expanded);
    document.body.classList.toggle("menu-open", !expanded);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  menu.addEventListener("click", (event) => {
    if (event.target === menu) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeMenu();
    }
  });
}

function initScrollReset() {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  window.addEventListener("load", () => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  });
}

async function loadSiteData() {
  const response = await fetch("/api/public-site-data", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Site data load failed");
  }
  return response.json();
}

async function initPage() {
  initScrollReset();
  initMobileMenu();
  initDonationPresets();

  let data = DEFAULT_CONTENT;

  try {
    data = await loadSiteData();
  } catch {
    data = DEFAULT_CONTENT;
  }

  const organization = data.organization || DEFAULT_CONTENT.organization;
  const donation = data.donation || DEFAULT_CONTENT.donation;
  const paymentGateway = data.paymentGateway || DEFAULT_CONTENT.paymentGateway;
  const publications = Array.isArray(data.publications) && data.publications.length
    ? data.publications
    : DEFAULT_CONTENT.publications;

  applyBranding(organization);
  renderHero(organization);
  renderThemes(organization.themes);
  renderHeroStats(publications.length);
  renderHighlights(organization.highlights);
  renderAbout(organization.about);
  renderDonation(donation);
  renderPaymentGateway(paymentGateway);
  renderPublications(publications);
  renderInstagram(organization.instagram || DEFAULT_CONTENT.organization.instagram);

  try {
    await refreshInstagramStats(organization, true);
  } catch {
    renderInstagram(organization.instagram || DEFAULT_CONTENT.organization.instagram);
  }

  setInterval(() => {
    refreshInstagramStats(organization, true).catch(() => {});
  }, 30000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshInstagramStats(organization, true).catch(() => {});
    }
  });

  window.addEventListener("focus", () => {
    refreshInstagramStats(organization, true).catch(() => {});
  });
}

initPage().catch(() => {
  applyBranding(DEFAULT_CONTENT.organization);
  renderHero(DEFAULT_CONTENT.organization);
  renderThemes(DEFAULT_CONTENT.organization.themes);
  renderHeroStats(DEFAULT_CONTENT.publications.length);
  renderHighlights(DEFAULT_CONTENT.organization.highlights);
  renderAbout(DEFAULT_CONTENT.organization.about);
  renderDonation(DEFAULT_CONTENT.donation);
  renderPaymentGateway(DEFAULT_CONTENT.paymentGateway);
  renderPublications(DEFAULT_CONTENT.publications);
  renderInstagram(DEFAULT_CONTENT.organization.instagram);
});
