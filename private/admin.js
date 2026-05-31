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

let currentData = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showDashboard(show) {
  loginView.classList.toggle("hidden", show);
  dashboardView.classList.toggle("hidden", !show);
}

function createPublicationFields(item, index) {
  return `
    <article class="publication-editor-item">
      <div class="editor-item-header">
        <h3>專刊 ${index + 1}</h3>
        <button class="button secondary delete-publication-button" type="button" data-remove-id="${item.id}">刪除</button>
      </div>
      <label>
        標題
        <input type="text" data-field="title" data-id="${item.id}" value="${escapeHtml(item.title)}" required />
      </label>
      <label>
        期數
        <input type="text" data-field="issue" data-id="${item.id}" value="${escapeHtml(item.issue)}" required />
      </label>
      <label>
        標籤
        <input type="text" data-field="tag" data-id="${item.id}" value="${escapeHtml(item.tag)}" />
      </label>
      <label>
        狀態
        <input type="text" data-field="status" data-id="${item.id}" value="${escapeHtml(item.status)}" required />
      </label>
      <label>
        說明
        <textarea rows="4" data-field="description" data-id="${item.id}" required>${escapeHtml(item.description)}</textarea>
      </label>
    </article>
  `;
}

function renderAdminAccounts(admins) {
  adminAccountList.innerHTML = admins
    .map(
      (item) => `
        <article class="publication-editor-item">
          <h3>${escapeHtml(item.username)}</h3>
          <p class="caption">建立時間：${
            item.createdAt ? new Date(item.createdAt).toLocaleString("zh-TW") : "未提供"
          }</p>
        </article>
      `
    )
    .join("");
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

  document.getElementById("organization-name-input").value = data.organization.name;
  document.getElementById("organization-tagline-input").value = data.organization.tagline;
  document.getElementById("organization-mission-input").value = data.organization.mission;
  document.getElementById("about-paragraph-1").value = data.organization.about[0] || "";
  document.getElementById("about-paragraph-2").value = data.organization.about[1] || "";
  document.getElementById("about-paragraph-3").value = data.organization.about[2] || "";
  document.getElementById("highlight-1").value = data.organization.highlights[0] || "";
  document.getElementById("highlight-2").value = data.organization.highlights[1] || "";
  document.getElementById("highlight-3").value = data.organization.highlights[2] || "";

  document.getElementById("donation-title-input").value = donation.title;
  document.getElementById("donation-raised-input").value = donation.raised;
  document.getElementById("donation-target-input").value = donation.target;
  document.getElementById("donation-show-target-input").checked = donation.showTarget;
  document.getElementById("donation-summary-input").value = donation.summary;
  document.getElementById("transfer-bank-name-input").value = donation.bankTransfer.bankName;
  document.getElementById("transfer-account-name-input").value = donation.bankTransfer.accountName;
  document.getElementById("transfer-account-number-input").value =
    donation.bankTransfer.accountNumber;
  document.getElementById("transfer-note-input").value = donation.bankTransfer.note;

  publicationEditor.innerHTML = data.publications.map(createPublicationFields).join("");
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
    name: document.getElementById("organization-name-input").value.trim(),
    tagline: document.getElementById("organization-tagline-input").value.trim(),
    mission: document.getElementById("organization-mission-input").value.trim(),
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
  const showTarget = document.getElementById("donation-show-target-input").checked;

  return {
    title: document.getElementById("donation-title-input").value.trim(),
    raised: Number(document.getElementById("donation-raised-input").value),
    target: Number(document.getElementById("donation-target-input").value || 0),
    showTarget,
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
  saveMessage.textContent = "內容已更新。";
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
        title: "新專刊標題",
        issue: "新期數",
        tag: "",
        description: "請輸入專刊說明。",
        status: "規劃中"
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

logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  loginForm.reset();
  showDashboard(false);
});

(async function init() {
  try {
    await fetchAdminSession();
    const [siteData, accounts] = await Promise.all([fetchSiteData(), fetchAdminAccounts()]);
    fillForm(siteData);
    renderAdminAccounts(accounts.admins);
    showDashboard(true);
  } catch (error) {
    showDashboard(false);
  }
})();
