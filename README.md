# LinkSpace 雲宇

在家運動時，像有教練盯著你的動作。

Web MVP：指定下背修復動作 + 鏡頭即時骨架評分 + YouTube 跟練 + 每日紀錄 + 俱樂部。姿勢分析在瀏覽器內跑（MediaPipe），不需要 GPU 伺服器。

產品 repo：https://github.com/yurenliuuni/LS_agent  
上線後：https://yurenliuuni.github.io/LS_agent/

Repo **Settings → Pages → Source** 選 **GitHub Actions**（若第一次部署失敗，開這個後再重跑 Actions）。

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
