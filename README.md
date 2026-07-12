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

## 正式部署

目前專案正式部署路線以 Cloudflare 為主：

- Cloudflare Workers：負責 API 與後台路由
- Cloudflare Assets：提供前端靜態檔案
- Cloudflare D1：保存網站資料與管理員資料

部署與設定請直接參考：

- [CLOUDFLARE_DEPLOY.md](C:/Users/momo1/Documents/專案/第一次使用/CLOUDFLARE_DEPLOY.md)

## 上線後注意事項

- 若本機使用 `server.js` 啟動，資料仍可能來自本機 `data/site-data.json`
- 若部署到 Cloudflare，正式站資料來源會以 D1 為主
- 若要讓本機與正式站資料保持一致，需同步更新 Cloudflare 端資料

## 目前限制

- 後台登入 session 目前存在記憶體，伺服器重啟後會重新登入
- 後台修改內容目前寫回本機 `data/site-data.json`
- 如果要正式上線並長期多人使用，建議下一步改成資料庫版本，例如 Supabase 免費方案搭配 `*.vercel.app` 或 `*.netlify.app` 免費子網域
