# 人社青年網站

這是一個用 Node.js 內建模組製作的簡易網站，不需要額外安裝套件即可啟動。

## 功能

- 前台有下拉式選單，包含募款、專刊、關於我們
- 後台有帳號密碼登入
- 後台可查看與更新募款金額
- 後台可修改刊物資料，前台會同步顯示

## 啟動方式

最簡單的方式是直接執行：

```powershell
.\start-site.ps1
```

或雙擊：

```text
start-site.cmd
```

這會：

- 自動找到可用的 Node.js
- 啟動網站伺服器
- 自動在瀏覽器開啟 `http://localhost:3000`

如果你想手動啟動，也可以用：

```powershell
& "C:\Users\momo1\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
```

## 預設後台帳密

- 帳號：`admin`
- 密碼：`renshe2026`

建議部署時改用環境變數：

```powershell
$env:ADMIN_USER="your_admin"
$env:ADMIN_PASSWORD="your_password"
.\start-site.ps1
```

## 資料位置

- 網站文字與募款資料：`data/site-data.json`

## 免費網域與部署建議

如果要保留這個 Node 後台，最簡單的免費方案是：

- Render 免費 Web Service：可部署 Node 服務，會提供 `*.onrender.com` 免費子網域，但閒置後會休眠。
- Vercel Hobby：可提供 `*.vercel.app` 免費子網域，適合部署，但這個專案若要保留檔案寫入型後台，需再改成資料庫或外部儲存。
- Netlify Free：可提供 `*.netlify.app` 免費子網域，靜態頁面很方便，但這個後台同樣需要改成 serverless 或資料庫版本較穩定。

目前這份專案最適合先部署到 Render 的免費子網域做展示版。
但要注意：這個專案目前把後台資料寫在本機 JSON 檔，免費主機重啟、重新部署或清理環境後，資料可能不會永久保留。

## Render 部署

這個專案已經補好 `render.yaml`，可直接部署到 Render 的免費 `onrender.com` 子網域。

### 部署步驟

1. 把這個專案上傳到 GitHub。
2. 登入 Render。
3. 選擇 `New +` -> `Blueprint`。
4. 連接你的 GitHub repository。
5. Render 會自動讀取根目錄的 `render.yaml`。
6. 建立服務後，Render 會提供一個 `*.onrender.com` 網址。

### Render 目前設定

- Runtime: `Node`
- Plan: `free`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check: `/api/health`

### 上線後注意事項

- 免費 web service 閒置後可能休眠，第一次打開會稍慢。
- 目前網站資料仍寫在本機檔案，所以重新部署後，後台新增的管理員與修改的刊物內容可能回到 repo 版本。
- 若要長期穩定保存資料，下一步建議改接資料庫。

## 目前限制

- 後台登入 session 目前存在記憶體，伺服器重啟後會重新登入
- 後台修改內容目前寫回本機 `data/site-data.json`
- 如果要正式上線並長期多人使用，建議下一步改成資料庫版本，例如 Supabase 免費方案搭配 `*.vercel.app` 或 `*.netlify.app` 免費子網域
