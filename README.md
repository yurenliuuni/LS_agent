# LinkSpace 雲宇

在家運動時，像有教練盯著你的動作。

Web MVP：指定下背修復動作 + 鏡頭即時骨架評分 + YouTube 跟練 + 每日紀錄 + 俱樂部。姿勢分析在瀏覽器內跑（MediaPipe），不需要 GPU 伺服器。

## 建議：開一個全新 GitHub repo

`LS_v0` 的 `master` 與這份產品是兩條不相干的 git 歷史，不必硬比。請建一個**空的**新 repo（不要勾 README / .gitignore / license），例如 `linkspace`，然後把 URL 貼回來，我推上 `main`。

建立 Fine-grained 或 classic PAT 時請一次給齊：

| 權限 | 為什麼需要 |
| --- | --- |
| `contents: write` | 推程式 |
| `workflows: write` | 寫 GitHub Actions 才能自動上線 |
| `pages: write` | 部署 GitHub Pages |
| `pull-requests: write` | 開 PR（可選） |

Repo **Settings → Pages → Source** 選 **GitHub Actions**。

## 本機前端

```bash
cd linkspace-frontend
npm install
npm run dev
```

開啟 http://localhost:5173 。請允許相機；鏡頭會顯示**完整畫面**（不裁切），請把電腦放遠直到頭到腳都在虛線框內。

## 本機後端（帳號／排行榜，可選）

```bash
cd linkspace-backend
cp .env.example .env
docker compose up --build
```

API：http://localhost:8000/docs
