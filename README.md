# LinkSpace 雲宇

在家運動時，像有教練盯著你的動作。

Web MVP：指定下背修復動作 + 鏡頭即時骨架評分 + YouTube 跟練 + 每日紀錄 + 俱樂部。姿勢分析在瀏覽器內跑（MediaPipe），不需要 GPU 伺服器。

## 上線（GitHub Pages）

目前 token 沒有 `workflow` 權限，無法直接寫入 `.github/workflows`。

請你做這三件事（約 2 分鐘）：

1. GitHub repo **Settings → Pages → Source** 選 **GitHub Actions**
2. 把 `docs/pages.workflow.yml` 複製成 `.github/workflows/pages.yml` 後 commit 到 `master`（或把 token 加上 `workflow` scope 再跟我說一聲）
3. 合併 `ship-web-mvp` 進 `master`

請用 **HTTPS 桌面瀏覽器**，允許相機，並讓頭、軀幹、膝蓋都入鏡。

## 本機前端

```bash
cd linkspace-frontend
npm install
npm run dev
```

開啟 http://localhost:5173

## 本機後端（帳號／排行榜，可選）

```bash
cd linkspace-backend
cp .env.example .env
docker compose up --build
```

API：http://localhost:8000/docs
