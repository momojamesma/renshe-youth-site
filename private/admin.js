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
const importInstagramButton = document.getElementById("import-instagram-button");
const publicationImportMessage = document.getElementById("publication-import-message");
const avatarFileInput = document.getElementById("avatar-file-input");
const avatarClearButton = document.getElementById("avatar-clear-button");
const avatarPreview = document.getElementById("avatar-preview");
const avatarPreviewFallback = document.getElementById("avatar-preview-fallback");
const avatarFileMessage = document.getElementById("avatar-file-message");
const brandMarkTextInput = document.getElementById("brand-mark-text-input");
const instagramHandleInput = document.getElementById("instagram-handle-input");
const instagramUrlInput = document.getElementById("instagram-url-input");

const ADMIN_USERNAME_RULE = /^[A-Za-z0-9._]{1,30}$/;
const PROTECTED_ADMIN_USERNAME = "renshe_admin";
const MAX_AVATAR_FILE_SIZE = 1.5 * 1024 * 1024;

let currentData = null;
let currentAdminUsername = "";
let currentAvatarDataUrl = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function validateAdminCredentials(username, password) {
  if (!ADMIN_USERNAME_RULE.test(username)) {
    return "帳號只能使用英文、數字、底線與句點，且長度需在 1 到 30 字元之間。";
  }

  if (typeof password !== "string" || password.length < 8) {
    return "密碼至少需要 8 碼。";
  }

  return "";
}

function buildInstagramUrl(handle) {
  const normalizedHandle = String(handle || "").trim().replace(/^@+/, "");
  return normalizedHandle ? `https://www.instagram.com/${normalizedHandle}/` : "";
}

function showDashboard(show) {
  loginView.classList.toggle("hidden", show);
  dashboardView.classList.toggle("hidden", !show);
}

function renderAvatarPreview() {
  const fallbackText = brandMarkTextInput.value.trim() || "RY";
  avatarPreviewFallback.textContent = fallbackText;

  if (currentAvatarDataUrl) {
    avatarPreview.src = currentAvatarDataUrl;
    avatarPreview.classList.remove("hidden");
    avatarPreviewFallback.classList.add("hidden");
    return;
  }

  avatarPreview.removeAttribute("src");
  avatarPreview.classList.add("hidden");
  avatarPreviewFallback.classList.remove("hidden");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("無法讀取圖片檔案。"));
    reader.readAsDataURL(file);
  });
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

function renderPublications() {
  publicationEditor.innerHTML = (currentData?.publications || []).map(createPublicationFields).join("");
}

function renderAdminAccounts(admins) {
  adminAccountList.innerHTML = admins
    .map((item) => {
      const canDelete =
        item.username !== PROTECTED_ADMIN_USERNAME && item.username !== currentAdminUsername;

      return `
        <article class="publication-editor-item">
          <div class="editor-item-header">
            <div>
              <h3>${escapeHtml(item.username)}</h3>
              <p class="caption">建立時間：${
                item.createdAt ? new Date(item.createdAt).toLocaleString("zh-TW") : "未提供"
              }</p>
            </div>
            ${
              canDelete
                ? `<button class="button secondary delete-admin-button" type="button" data-username="${escapeHtml(
                    item.username
                  )}">刪除管理員</button>`
                : ""
            }
          </div>
        </article>
      `;
    })
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
  currentData = {
    ...data,
    organization: data.organization || {},
    donation: data.donation || {},
    publications: Array.isArray(data.publications) ? data.publications : []
  };

  const donation = getSafeDonation(currentData);
  const appearance = currentData.organization?.appearance || {};
  const instagram = currentData.organization?.instagram || {};

  document.getElementById("organization-name-input").value = currentData.organization.name ?? "";
  document.getElementById("organization-tagline-input").value =
    currentData.organization.tagline ?? "";
  document.getElementById("organization-mission-input").value =
    currentData.organization.mission ?? "";
  instagramHandleInput.value = instagram.handle ?? "";
  instagramUrlInput.value = instagram.url ?? "";
  currentAvatarDataUrl = currentData.organization.avatarUrl ?? "";
  avatarFileInput.value = "";
  brandMarkTextInput.value = appearance.brandMarkText ?? "RY";
  document.getElementById("about-paragraph-1").value = currentData.organization.about?.[0] ?? "";
  document.getElementById("about-paragraph-2").value = currentData.organization.about?.[1] ?? "";
  document.getElementById("about-paragraph-3").value = currentData.organization.about?.[2] ?? "";
  document.getElementById("highlight-1").value = currentData.organization.highlights?.[0] ?? "";
  document.getElementById("highlight-2").value = currentData.organization.highlights?.[1] ?? "";
  document.getElementById("highlight-3").value = currentData.organization.highlights?.[2] ?? "";

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
  document.getElementById("instagram-post-url").value = "";
  publicationImportMessage.textContent = "";
  avatarFileMessage.textContent = "";

  renderAvatarPreview();
  renderPublications();
}

function collectPublications() {
  return (currentData?.publications || []).map((item) => {
    const updated = { ...item };
    publicationEditor.querySelectorAll(`[data-id="${item.id}"]`).forEach((field) => {
      updated[field.dataset.field] = field.value.trim();
    });
    return updated;
  });
}

function collectOrganization() {
  const handle = instagramHandleInput.value.trim();
  const url = instagramUrlInput.value.trim() || buildInstagramUrl(handle);

  return {
    ...(currentData.organization || {}),
    name: document.getElementById("organization-name-input").value.trim(),
    tagline: document.getElementById("organization-tagline-input").value.trim(),
    mission: document.getElementById("organization-mission-input").value.trim(),
    avatarUrl: currentAvatarDataUrl,
    instagram: {
      ...(currentData.organization?.instagram || {}),
      handle,
      url
    },
    appearance: {
      ...(currentData.organization?.appearance || {}),
      brandMarkText: brandMarkTextInput.value.trim() || "RY"
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
  if (!response.ok) {
    throw new Error("Site data fetch failed");
  }
  return response.json();
}

async function fetchAdminAccounts() {
  const response = await fetch("/api/admin/accounts");
  if (!response.ok) {
    throw new Error("Account fetch failed");
  }
  return response.json();
}

function getNextPublicationId() {
  return (
    (currentData?.publications || []).reduce(
      (maxId, item) => Math.max(maxId, Number(item.id) || 0),
      0
    ) + 1
  );
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
    loginMessage.textContent = result.error || "登入失敗。";
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
    saveMessage.textContent = result.error || "儲存失敗。";
    return;
  }

  fillForm(result);
  saveMessage.textContent = "網站內容已儲存。";
});

addPublicationButton.addEventListener("click", () => {
  if (!currentData) {
    return;
  }

  currentData = {
    ...currentData,
    publications: [
      ...(currentData.publications || []),
      {
        id: getNextPublicationId(),
        title: "新刊物標題",
        tag: "",
        description: "請輸入刊物說明。",
        content: "請輸入完整刊物內容。"
      }
    ]
  };

  renderPublications();
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
  renderPublications();
});

importInstagramButton.addEventListener("click", async () => {
  if (!currentData) {
    return;
  }

  const urlInput = document.getElementById("instagram-post-url");
  const url = urlInput.value.trim();
  publicationImportMessage.textContent = "";

  if (!url) {
    publicationImportMessage.textContent = "請先貼上 Instagram 貼文網址。";
    return;
  }

  importInstagramButton.disabled = true;

  try {
    const response = await fetch("/api/admin/import-publication", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const result = await response.json();
    if (!response.ok) {
      publicationImportMessage.textContent = result.error || "Instagram 匯入失敗。";
      return;
    }

    currentData = {
      ...currentData,
      publications: [
        ...(currentData.publications || []),
        {
          id: getNextPublicationId(),
          title: result.publication.title,
          tag: result.publication.tag,
          description: result.publication.description,
          content: result.publication.content
        }
      ]
    };

    renderPublications();
    urlInput.value = "";
    publicationImportMessage.textContent = "已匯入為刊物草稿，請記得儲存網站內容。";
  } catch (error) {
    publicationImportMessage.textContent = "Instagram 匯入失敗，請稍後再試。";
  } finally {
    importInstagramButton.disabled = false;
  }
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
    adminMessage.textContent = result.error || "新增管理員失敗。";
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
    adminMessage.textContent = result.error || "刪除管理員失敗。";
    return;
  }

  renderAdminAccounts(result.admins);
  adminMessage.textContent = "管理員已刪除。";
});

avatarFileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  avatarFileMessage.textContent = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    avatarFileMessage.textContent = "請選擇圖片檔案。";
    avatarFileInput.value = "";
    return;
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    avatarFileMessage.textContent = "圖片檔案請控制在 1.5 MB 以內。";
    avatarFileInput.value = "";
    return;
  }

  try {
    currentAvatarDataUrl = await readFileAsDataUrl(file);
    renderAvatarPreview();
    avatarFileMessage.textContent = "頭像已載入，記得按下儲存網站內容。";
  } catch (error) {
    avatarFileMessage.textContent = error.message || "讀取圖片失敗。";
  }
});

avatarClearButton.addEventListener("click", () => {
  currentAvatarDataUrl = "";
  avatarFileInput.value = "";
  avatarFileMessage.textContent = "頭像已移除，記得按下儲存網站內容。";
  renderAvatarPreview();
});

brandMarkTextInput.addEventListener("input", () => {
  renderAvatarPreview();
});

instagramHandleInput.addEventListener("blur", () => {
  if (!instagramUrlInput.value.trim()) {
    instagramUrlInput.value = buildInstagramUrl(instagramHandleInput.value);
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showDashboard(false);
  loginForm.reset();
  currentAdminUsername = "";
  currentAvatarDataUrl = "";
  loginMessage.textContent = "";
  saveMessage.textContent = "";
  adminMessage.textContent = "";
  avatarFileMessage.textContent = "";
  publicationImportMessage.textContent = "";
});

Promise.all([fetchAdminSession(), fetchSiteData(), fetchAdminAccounts()])
  .then(([session, siteData, accounts]) => {
    currentAdminUsername = session.username;
    fillForm(siteData);
    renderAdminAccounts(accounts.admins);
    showDashboard(true);
  })
  .catch(() => {
    showDashboard(false);
  });
