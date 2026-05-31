const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const dashboardForm = document.getElementById("dashboard-form");
const publicationEditor = document.getElementById("publication-editor");
const loginMessage = document.getElementById("login-message");
const saveMessage = document.getElementById("save-message");
const logoutButton = document.getElementById("logout-button");
const addPublicationButton = document.getElementById("add-publication-button");
const adminAccountList = document.getElementById("admin-account-list");
const adminMessage = document.getElementById("admin-message");
const createAdminButton = document.getElementById("create-admin-button");

const DEFAULT_SECTION_COLORS = {
  header: "#f5f1e8",
  hero: "#f2eadf",
  highlights: "#f7f1e8",
  donate: "#f1e7d8",
  publications: "#f8f3ec",
  about: "#efe5d8",
  footer: "#23423a"
};

let currentData = null;
let currentAdminUsername = "";

const ADMIN_USERNAME_RULE = /^[A-Za-z0-9._]{1,30}$/;
const PROTECTED_ADMIN_USERNAME = "renshe_admin";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function validateAdminCredentials(username, password) {
  if (!ADMIN_USERNAME_RULE.test(username)) {
    return "帳號需為 1 到 30 字元，只能使用英文、數字、底線(_)與句點(.)，不可有空格。";
  }

  if (typeof password !== "string" || password.length < 8) {
    return "密碼至少需要 8 碼。";
  }

  return "";
}

function showDashboard(show) {
  loginView.classList.toggle("hidden", show);
  dashboardView.classList.toggle("hidden", !show);
}

function createPublicationFields(item, index) {
  return `
    <article class="publication-editor-item">
      <div class="editor-item-header">
        <h3>刊物 ${index + 1}</h3>
        <button class="button secondary delete-publication-button" type="button" data-remove-id="${item.id}">刪除</button>
      </div>
      <label>
        標題
        <input type="text" data-field="title" data-id="${item.id}" value="${escapeHtml(item.title)}" required />
      </label>
      <label>
        標籤
        <input type="text" data-field="tag" data-id="${item.id}" value="${escapeHtml(item.tag)}" />
      </label>
      <label>
        說明
        <textarea rows="4" data-field="description" data-id="${item.id}" required>${escapeHtml(item.description)}</textarea>
      </label>
      <label>
        內文
        <textarea rows="10" data-field="content" data-id="${item.id}" required>${escapeHtml(item.content)}</textarea>
      </label>
    </article>
  `;
}

function renderAdminAccounts(admins) {
  adminAccountList.innerHTML = admins
    .map((item) => {
      const deleteButton =
        item.username === PROTECTED_ADMIN_USERNAME
          ? ""
          : `
            <button
              class="button secondary delete-admin-button"
              type="button"
              data-username="${escapeHtml(item.username)}"
              ${item.username === currentAdminUsername ? "disabled" : ""}
            >
              刪除管理員
            </button>
          `;

      return `
        <article class="publication-editor-item">
          <div class="editor-item-header">
            <div>
              <h3>${escapeHtml(item.username)}</h3>
              <p class="caption">建立時間：${
                item.createdAt ? new Date(item.createdAt).toLocaleString("zh-TW") : "未提供"
              }</p>
            </div>
            ${deleteButton}
          </div>
        </article>
      `;
    })
    .join("");
}

function getSafeAppearance(organization) {
  return {
    brandMarkText: organization?.appearance?.brandMarkText ?? "RY",
    sectionColors: {
      ...DEFAULT_SECTION_COLORS,
      ...(organization?.appearance?.sectionColors || {})
    }
  };
}

function getSafeDonation(data) {
  return {
    showTarget: data?.donation?.showTarget !== false,
    target: data?.donation?.target ?? 0,
    raised: data?.donation?.raised ?? 0,
    title: data?.donation?.title ?? "",
    summary: data?.donation?.summary ?? "",
    bankTransfer: {
      bankName: data?.donation?.bankTransfer?.bankName ?? "",
      accountName: data?.donation?.bankTransfer?.accountName ?? "",
      accountNumber: data?.donation?.bankTransfer?.accountNumber ?? "",
      note: data?.donation?.bankTransfer?.note ?? ""
    }
  };
}

function fillForm(data) {
  currentData = data;
  const donation = getSafeDonation(data);
  const appearance = getSafeAppearance(data.organization);

  document.getElementById("organization-name-input").value = data.organization?.name ?? "";
  document.getElementById("organization-tagline-input").value = data.organization?.tagline ?? "";
  document.getElementById("organization-mission-input").value = data.organization?.mission ?? "";
  document.getElementById("avatar-url-input").value = data.organization?.avatarUrl ?? "";
  document.getElementById("brand-mark-text-input").value = appearance.brandMarkText;
  document.getElementById("color-header-input").value = appearance.sectionColors.header;
  document.getElementById("color-hero-input").value = appearance.sectionColors.hero;
  document.getElementById("color-highlights-input").value = appearance.sectionColors.highlights;
  document.getElementById("color-donate-input").value = appearance.sectionColors.donate;
  document.getElementById("color-publications-input").value = appearance.sectionColors.publications;
  document.getElementById("color-about-input").value = appearance.sectionColors.about;
  document.getElementById("color-footer-input").value = appearance.sectionColors.footer;
  document.getElementById("about-paragraph-1").value = data.organization?.about?.[0] ?? "";
  document.getElementById("about-paragraph-2").value = data.organization?.about?.[1] ?? "";
  document.getElementById("about-paragraph-3").value = data.organization?.about?.[2] ?? "";
  document.getElementById("highlight-1").value = data.organization?.highlights?.[0] ?? "";
  document.getElementById("highlight-2").value = data.organization?.highlights?.[1] ?? "";
  document.getElementById("highlight-3").value = data.organization?.highlights?.[2] ?? "";

  document.getElementById("donation-title-input").value = donation.title;
  document.getElementById("donation-raised-input").value = donation.raised;
  document.getElementById("donation-target-input").value = donation.target;
  document.getElementById("donation-show-target-input").checked = donation.showTarget;
  document.getElementById("donation-summary-input").value = donation.summary;
  document.getElementById("transfer-bank-name-input").value = donation.bankTransfer.bankName;
  document.getElementById("transfer-account-name-input").value = donation.bankTransfer.accountName;
  document.getElementById("transfer-account-number-input").value = donation.bankTransfer.accountNumber;
  document.getElementById("transfer-note-input").value = donation.bankTransfer.note;

  publicationEditor.innerHTML = (data.publications || []).map(createPublicationFields).join("");
}

function collectPublications() {
  return currentData.publications.map((item) => {
    const updated = { ...item };
    publicationEditor.querySelectorAll(`[data-id="${item.id}"]`).forEach((field) => {
      updated[field.dataset.field] = field.value.trim();
    });
    return updated;
  });
}

function collectOrganization() {
  return {
    ...(currentData.organization || {}),
    name: document.getElementById("organization-name-input").value.trim(),
    tagline: document.getElementById("organization-tagline-input").value.trim(),
    mission: document.getElementById("organization-mission-input").value.trim(),
    avatarUrl: document.getElementById("avatar-url-input").value.trim(),
    appearance: {
      ...(currentData.organization?.appearance || {}),
      brandMarkText: document.getElementById("brand-mark-text-input").value.trim() || "RY",
      sectionColors: {
        header: document.getElementById("color-header-input").value,
        hero: document.getElementById("color-hero-input").value,
        highlights: document.getElementById("color-highlights-input").value,
        donate: document.getElementById("color-donate-input").value,
        publications: document.getElementById("color-publications-input").value,
        about: document.getElementById("color-about-input").value,
        footer: document.getElementById("color-footer-input").value
      }
    },
    about: [
      document.getElementById("about-paragraph-1").value.trim(),
      document.getElementById("about-paragraph-2").value.trim(),
      document.getElementById("about-paragraph-3").value.trim()
    ],
    highlights: [
      document.getElementById("highlight-1").value.trim(),
      document.getElementById("highlight-2").value.trim(),
      document.getElementById("highlight-3").value.trim()
    ]
  };
}

function collectDonation() {
  return {
    ...(currentData.donation || {}),
    title: document.getElementById("donation-title-input").value.trim(),
    raised: Number(document.getElementById("donation-raised-input").value || 0),
    target: Number(document.getElementById("donation-target-input").value || 0),
    showTarget: document.getElementById("donation-show-target-input").checked,
    summary: document.getElementById("donation-summary-input").value.trim(),
    bankTransfer: {
      bankName: document.getElementById("transfer-bank-name-input").value.trim(),
      accountName: document.getElementById("transfer-account-name-input").value.trim(),
      accountNumber: document.getElementById("transfer-account-number-input").value.trim(),
      note: document.getElementById("transfer-note-input").value.trim()
    }
  };
}

async function fetchAdminSession() {
  const response = await fetch("/api/admin/session");
  if (!response.ok) {
    throw new Error("No session");
  }
  return response.json();
}

async function fetchSiteData() {
  const response = await fetch("/api/site-data");
  return response.json();
}

async function fetchAdminAccounts() {
  const response = await fetch("/api/admin/accounts");
  if (!response.ok) {
    throw new Error("Account fetch failed");
  }
  return response.json();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  const formData = new FormData(loginForm);
  const payload = {
    username: formData.get("username"),
    password: formData.get("password")
  };

  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    loginMessage.textContent = result.error || "登入失敗";
    return;
  }

  currentAdminUsername = result.username;
  const [siteData, accounts] = await Promise.all([fetchSiteData(), fetchAdminAccounts()]);
  fillForm(siteData);
  renderAdminAccounts(accounts.admins);
  showDashboard(true);
});

dashboardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveMessage.textContent = "";

  const payload = {
    organization: collectOrganization(),
    donation: collectDonation(),
    publications: collectPublications()
  };

  const response = await fetch("/api/admin/site-data", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    saveMessage.textContent = result.error || "儲存失敗";
    return;
  }

  fillForm(result);
  saveMessage.textContent = "內容已儲存。";
});

addPublicationButton.addEventListener("click", () => {
  if (!currentData) {
    return;
  }

  const nextId =
    currentData.publications.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;

  currentData = {
    ...currentData,
    publications: [
      ...currentData.publications,
      {
        id: nextId,
        title: "新刊物標題",
        tag: "",
        description: "請輸入刊物說明。",
        content: "請輸入完整刊物內容。"
      }
    ]
  };

  publicationEditor.innerHTML = currentData.publications.map(createPublicationFields).join("");
});

publicationEditor.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-id]");
  if (!button || !currentData) {
    return;
  }

  const removeId = Number(button.dataset.removeId);
  currentData = {
    ...currentData,
    publications: currentData.publications.filter((item) => Number(item.id) !== removeId)
  };
  publicationEditor.innerHTML = currentData.publications.map(createPublicationFields).join("");
});

createAdminButton.addEventListener("click", async () => {
  adminMessage.textContent = "";
  const username = document.getElementById("new-admin-username").value.trim();
  const password = document.getElementById("new-admin-password").value;
  const validationError = validateAdminCredentials(username, password);

  if (validationError) {
    adminMessage.textContent = validationError;
    return;
  }

  const response = await fetch("/api/admin/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();
  if (!response.ok) {
    adminMessage.textContent = result.error || "新增管理員失敗";
    return;
  }

  renderAdminAccounts(result.admins);
  document.getElementById("new-admin-username").value = "";
  document.getElementById("new-admin-password").value = "";
  adminMessage.textContent = "管理員已新增。";
});

adminAccountList.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-admin-button");
  if (!button) {
    return;
  }

  const username = button.dataset.username;
  if (!username) {
    return;
  }

  const confirmed = window.confirm(`確定要刪除管理員 ${username} 嗎？`);
  if (!confirmed) {
    return;
  }

  adminMessage.textContent = "";

  const response = await fetch(`/api/admin/accounts/${encodeURIComponent(username)}`, {
    method: "DELETE"
  });

  const result = await response.json();
  if (!response.ok) {
    adminMessage.textContent = result.error || "刪除管理員失敗";
    return;
  }

  renderAdminAccounts(result.admins);
  adminMessage.textContent = "管理員已刪除。";
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  loginForm.reset();
  currentAdminUsername = "";
  showDashboard(false);
});

(async function init() {
  try {
    const session = await fetchAdminSession();
    currentAdminUsername = session.username;
    const [siteData, accounts] = await Promise.all([fetchSiteData(), fetchAdminAccounts()]);
    fillForm(siteData);
    renderAdminAccounts(accounts.admins);
    showDashboard(true);
  } catch (error) {
    showDashboard(false);
  }
})();
