const DEFAULT_CONTENT = {
  organization: {
    name: "人社青年",
    tagline: "用學生的眼光看人社，用人社的視角看社會",
    mission:
      "我們由一群關心公共議題的青年組成，持續以貼文、刊物與公開討論整理人文社會議題，讓更多人能在日常裡理解制度、理解社會，也理解自己與公共世界的關係。",
    instagram: {
      handle: "@youth.hss",
      url: "https://www.instagram.com/youth.hss/",
      followers: "1,486",
      posts: "93",
      following: "58"
    },
    themes: ["公共參與", "社會議題", "人文社會", "青年視角", "知識轉譯"],
    highlights: [
      "把複雜的制度與社會議題整理成青年也能快速讀懂的內容。",
      "用貼文與刊物串連日常觀察、理論概念與公共討論。",
      "讓更多人從閱讀開始，逐步走向對話、參與與行動。"
    ],
    about: [
      "人社青年由一群關心公共議題的高中生與大學生組成，希望讓人文社會知識離日常更近，也讓公共參與不再只是少數人的語言。",
      "我們透過 Instagram、專刊與行動企劃，把抽象的社會議題轉譯成更容易接近的內容，讓理解可以成為討論與參與的起點。",
      "從社會建構、特權、言論自由到轉型正義，我們持續關注影響社會的核心問題，並嘗試用青年視角提出新的閱讀方式。"
    ],
    appearance: {
      brandMarkText: "RY"
    }
  },
  donation: {
    title: "支持人社青年",
    summary:
      "你的支持會成為刊物製作、議題整理、社群內容經營與青年公共參與工作的基礎，幫助我們把更多重要議題帶進公共討論。",
    showTarget: true,
    target: 500000,
    raised: 186400,
    accounts: [
      "支持專刊企劃、議題整理與設計製作。",
      "支持青年公共參與活動與社群內容經營。",
      "支持人社青年長期穩定運作與合作計畫。"
    ],
    bankTransfer: {
      bankName: "玉山銀行",
      accountName: "人社青年",
      accountNumber: "808-1234-5678-9012",
      note: "匯款完成後，歡迎透過 Instagram 私訊告知後五碼，方便我們確認與致謝。"
    }
  },
  paymentGateway: {
    provider: "ecpay",
    enabled: true,
    sandbox: true,
    checkoutPath: "/api/payments/ecpay/checkout",
    methods: ["信用卡", "ATM", "超商代碼", "超商條碼"]
  },
  publications: [
    {
      id: 1,
      title: "專刊 Vol.01｜社會建構如何影響我們理解世界",
      description:
        "從日常常見的性別、身份與規範出發，重新理解什麼是社會建構，以及它如何影響我們看待「理所當然」的事。",
      tag: "社會建構",
      content:
        "很多我們以為天生如此、理所當然的事情，其實都深受社會脈絡影響。從性別角色到公共道德，從身分認同到對成功的想像，社會建構塑造了我們理解世界的方式。\n\n當我們談社會建構，不是說一切都不真實，而是提醒自己：我們現在習以為常的規則與分類，往往都是在歷史、文化與權力關係中逐步形成的。\n\n理解這一點的意義，在於我們不必把現況視為唯一可能。當我們開始看見制度與語言如何影響判斷，也就比較能為社會提出新的想像與新的選擇。"
    },
    {
      id: 2,
      title: "專刊 Vol.02｜當我們談特權，到底在談什麼",
      description:
        "特權不是單純指責個人，而是幫助我們辨認資源、制度與社會位置如何影響每個人的生活經驗。",
      tag: "特權",
      content:
        "特權常常讓人不舒服，因為它看起來像是在否定一個人的努力。但更精確地說，特權不是否定努力，而是補充說明：並不是每個人都站在相同的起點上。\n\n性別、階級、教育資源、族群與家庭背景，都可能讓某些人更容易取得機會，也讓另一些人更常面對阻礙。看見特權，不是為了製造罪惡感，而是為了讓制度討論更接近現實。\n\n當我們開始理解特權如何運作，就能更細緻地思考公平、資源分配與公共政策，也比較能把個人經驗放回社會脈絡中理解。"
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

function sanitizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text || looksCorrupted(text)) {
    return fallback;
  }
  return text;
}

function sanitizeList(items, fallback = []) {
  const list = Array.isArray(items)
    ? items.map((item) => sanitizeText(item)).filter(Boolean)
    : [];
  return list.length ? list : fallback;
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

  const punctuationMatch = normalized.slice(limit).match(/[。！？；.!?]/);
  if (punctuationMatch && Number.isFinite(punctuationMatch.index)) {
    const stopIndex = limit + punctuationMatch.index + 1;
    if (stopIndex <= limit + 18) {
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

function renderHighlights(items) {
  const container = document.getElementById("highlight-list");
  const list = sanitizeList(items, DEFAULT_CONTENT.organization.highlights);

  container.innerHTML = list
    .map(
      (item, index) => `
        <article>
          <p class="panel-label">Focus 0${index + 1}</p>
          <h3>${item}</h3>
          <p>把複雜的社會議題拆解成更容易理解的內容，讓閱讀不只停在知道，而能延伸成判斷與參與。</p>
        </article>
      `
    )
    .join("");
}

function renderThemes(items) {
  const container = document.getElementById("theme-list");
  const list = sanitizeList(items, DEFAULT_CONTENT.organization.themes);
  container.innerHTML = list.map((item) => `<span class="theme-pill">${item}</span>`).join("");
}

function renderAbout(paragraphs) {
  const container = document.getElementById("about-list");
  const list = sanitizeList(paragraphs, DEFAULT_CONTENT.organization.about);
  container.innerHTML = list.map((text) => `<p>${text}</p>`).join("");
}

function renderBankTransfer(bankTransfer) {
  const card = document.getElementById("bank-transfer-card");
  const bankName = sanitizeText(bankTransfer?.bankName);
  const accountNumber = sanitizeText(bankTransfer?.accountNumber);
  if (!bankName || !accountNumber) {
    card.classList.add("hidden");
    return;
  }

  document.getElementById("transfer-bank-name").textContent = bankName;
  document.getElementById("transfer-account-name").textContent = sanitizeText(
    bankTransfer?.accountName,
    DEFAULT_CONTENT.donation.bankTransfer.accountName
  );
  document.getElementById("transfer-account-number").textContent = accountNumber;
  document.getElementById("transfer-note").textContent = sanitizeText(
    bankTransfer?.note,
    DEFAULT_CONTENT.donation.bankTransfer.note
  );
  card.classList.remove("hidden");
}

function renderDonation(donation) {
  const targetAmount = document.getElementById("target-amount");
  const progressCaption = document.getElementById("progress-caption");
  const progressBar = document.getElementById("progress-bar");
  const raised = Number(donation?.raised) || DEFAULT_CONTENT.donation.raised;
  const target = Number(donation?.target) || DEFAULT_CONTENT.donation.target;
  const showTarget = donation?.showTarget !== false;

  document.getElementById("donation-title").textContent = sanitizeText(
    donation?.title,
    DEFAULT_CONTENT.donation.title
  );
  document.getElementById("donation-summary").textContent = sanitizeText(
    donation?.summary,
    DEFAULT_CONTENT.donation.summary
  );
  document.getElementById("raised-amount").textContent = formatCurrency(raised);

  if (showTarget && target > 0) {
    const progress = Math.min((raised / target) * 100, 100);
    targetAmount.textContent = `/ ${formatCurrency(target)}`;
    targetAmount.classList.remove("hidden");
    progressBar.style.width = `${progress}%`;
    progressCaption.textContent = `已達成 ${Math.round(progress)}%`;
    progressCaption.classList.remove("hidden");
  } else {
    targetAmount.textContent = "";
    targetAmount.classList.add("hidden");
    progressBar.style.width = "100%";
    progressCaption.textContent = "";
    progressCaption.classList.add("hidden");
  }

  const list = document.getElementById("donation-accounts");
  const accounts = sanitizeList(donation?.accounts, DEFAULT_CONTENT.donation.accounts);
  list.innerHTML = accounts.map((item) => `<li>${item}</li>`).join("");

  renderBankTransfer(donation?.bankTransfer || DEFAULT_CONTENT.donation.bankTransfer);
}

function renderPaymentGateway(paymentGateway) {
  const config = paymentGateway || DEFAULT_CONTENT.paymentGateway;
  const form = document.getElementById("payment-form");
  const note = document.getElementById("payment-gateway-note");
  const submitButton = document.getElementById("payment-submit-button");

  form.action = config.checkoutPath || DEFAULT_CONTENT.paymentGateway.checkoutPath;

  if (!config.enabled) {
    submitButton.disabled = true;
    note.textContent = "目前線上付款暫時不可用，請改用匯款方式支持我們。";
    return;
  }

  submitButton.disabled = false;
  if (config.publicNote) {
    note.textContent = config.publicNote;
    return;
  }

  note.textContent = config.sandbox
    ? "目前串接的是綠界測試付款頁，可用來測試流程；要正式收款需切換成正式商家資料。"
    : `付款將導向第三方金流頁，可使用 ${config.methods.join("、")} 完成付款。`;
}

function renderPublications(items) {
  const container = document.getElementById("publication-list");
  const publications = Array.isArray(items) && items.length ? items : DEFAULT_CONTENT.publications;

  container.innerHTML = publications
    .map((item, index) => {
      const fallback = DEFAULT_CONTENT.publications[index] || DEFAULT_CONTENT.publications[0];
      const title = sanitizeText(item?.title, fallback.title);
      const description = buildPublicationExcerpt(
        sanitizeText(item?.content, fallback.content) || sanitizeText(item?.description, fallback.description)
      );
      const tag = sanitizeText(item?.tag, fallback.tag);
      const id = Number(item?.id) || fallback.id;

      return `
        <article class="publication-item">
          <header>
            <div>
              <h3>${title}</h3>
            </div>
            <div class="publication-meta">
              ${tag ? `<span class="topic-pill">${tag}</span>` : ""}
            </div>
          </header>
          <p>${description}</p>
          <a class="inline-link publication-link" href="/publication.html?id=${id}">閱讀完整刊物</a>
        </article>
      `;
    })
    .join("");
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
  document.getElementById("ig-link").href = profileUrl;
  document.getElementById("ig-link").textContent = `${handle} 前往 Instagram`;
  document.getElementById("footer-ig-link").href = profileUrl;
  document.getElementById("footer-ig-link").textContent = handle;
}

let instagramRefreshTimer = null;
let instagramRefreshInFlight = false;

async function refreshInstagramStats(instagram, options = {}) {
  if (!instagram) {
    return;
  }

  if (instagramRefreshInFlight) {
    return;
  }

  const params = new URLSearchParams();
  const cleanUrl = sanitizeText(instagram.url);
  const cleanHandle = sanitizeText(instagram.handle);

  if (cleanUrl) {
    params.set("url", cleanUrl);
  } else if (cleanHandle) {
    params.set("handle", cleanHandle);
  }

  if (![...params.keys()].length) {
    return;
  }

  if (options.force) {
    params.set("refresh", "1");
  }

  instagramRefreshInFlight = true;
  try {
    const response = await fetch(`/api/instagram-profile?${params.toString()}`, {
      cache: "no-store"
    });
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
  } finally {
    instagramRefreshInFlight = false;
  }
}

function startInstagramAutoRefresh(instagram) {
  if (!instagram) {
    return;
  }

  if (instagramRefreshTimer) {
    window.clearInterval(instagramRefreshTimer);
  }

  instagramRefreshTimer = window.setInterval(() => {
    if (document.hidden) {
      return;
    }
    refreshInstagramStats(instagram).catch(() => {});
  }, 30 * 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshInstagramStats(instagram, { force: true }).catch(() => {});
    }
  });

  window.addEventListener("focus", () => {
    refreshInstagramStats(instagram, { force: true }).catch(() => {});
  });
}

function renderHeroStats(data) {
  const container = document.getElementById("hero-stats");
  const target = Number(data.donation?.target) || DEFAULT_CONTENT.donation.target;
  const raised = Number(data.donation?.raised) || DEFAULT_CONTENT.donation.raised;
  const progress =
    data.donation?.showTarget !== false && target > 0 ? Math.round((raised / target) * 100) : null;

  const stats = [
    {
      value: `${sanitizeList(data.organization?.themes, DEFAULT_CONTENT.organization.themes).length}+`,
      label: "核心議題"
    },
    {
      value: `${(Array.isArray(data.publications) && data.publications.length) || DEFAULT_CONTENT.publications.length}`,
      label: "刊物篇數"
    },
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

function bindDonationPaymentForm() {
  const amountInput = document.getElementById("payment-amount-input");
  const presetButtons = Array.from(document.querySelectorAll(".donation-preset"));
  const form = document.getElementById("payment-form");

  const setActivePreset = (amount) => {
    presetButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.amount === String(amount));
    });
  };

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      amountInput.value = button.dataset.amount || "";
      setActivePreset(button.dataset.amount || "");
    });
  });

  amountInput.addEventListener("input", () => {
    setActivePreset(amountInput.value.trim());
  });

  form.addEventListener("submit", (event) => {
    const amount = Number(amountInput.value || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      event.preventDefault();
      amountInput.focus();
    }
  });
}

async function loadSite() {
  const response = await fetch("/api/public-site-data");
  if (!response.ok) {
    throw new Error("Site data load failed");
  }

  const data = await response.json();
  const organization = data.organization || {};

  applyBranding(organization);
  document.getElementById("hero-title").textContent = sanitizeText(
    organization.tagline,
    DEFAULT_CONTENT.organization.tagline
  );
  document.getElementById("hero-mission").textContent = sanitizeText(
    organization.mission,
    DEFAULT_CONTENT.organization.mission
  );

  renderThemes(organization.themes);
  renderHeroStats(data);
  renderHighlights(organization.highlights);
  renderDonation(data.donation || DEFAULT_CONTENT.donation);
  renderPaymentGateway(data.paymentGateway || DEFAULT_CONTENT.paymentGateway);
  renderPublications(data.publications || DEFAULT_CONTENT.publications);
  renderAbout(organization.about);
  renderInstagram(organization.instagram || DEFAULT_CONTENT.organization.instagram);
  refreshInstagramStats(organization.instagram || DEFAULT_CONTENT.organization.instagram).catch(() => {});
  startInstagramAutoRefresh(organization.instagram || DEFAULT_CONTENT.organization.instagram);
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
    menu.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const setMenuState = (expanded) => {
    toggle.setAttribute("aria-expanded", String(expanded));
    menu.classList.toggle("open", expanded);
    document.body.classList.toggle("menu-open", expanded);
    if (expanded) {
      menu.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
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

  window.addEventListener("hashchange", closeMenu);

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeMenu();
    }
  });
}

function bindScrollReset() {
  const navigationEntry =
    typeof performance !== "undefined" && typeof performance.getEntriesByType === "function"
      ? performance.getEntriesByType("navigation")[0]
      : null;
  const navigationType = navigationEntry?.type || "";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const shouldScrollToTop = navigationType === "reload" || !window.location.hash;
  if (!shouldScrollToTop) {
    return;
  }

  const resetScroll = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  window.addEventListener("load", () => {
    resetScroll();
    requestAnimationFrame(resetScroll);
  });

  window.addEventListener("pageshow", resetScroll);
}

bindScrollReset();
bindMobileMenu();
bindDonationPaymentForm();
loadSite().catch(() => {
  document.getElementById("hero-title").textContent = DEFAULT_CONTENT.organization.tagline;
  document.getElementById("hero-mission").textContent = DEFAULT_CONTENT.organization.mission;
  renderThemes(DEFAULT_CONTENT.organization.themes);
  renderHeroStats(DEFAULT_CONTENT);
  renderHighlights(DEFAULT_CONTENT.organization.highlights);
  renderDonation(DEFAULT_CONTENT.donation);
  renderPaymentGateway(DEFAULT_CONTENT.paymentGateway);
  renderPublications(DEFAULT_CONTENT.publications);
  renderAbout(DEFAULT_CONTENT.organization.about);
  renderInstagram(DEFAULT_CONTENT.organization.instagram);
});
