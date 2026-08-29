# LinkSpace 雲宇

在家運動時，像有教練盯著你的動作。

Web MVP：指定下背修復動作 + 鏡頭即時骨架評分 + YouTube 跟練 + 每日紀錄 + 俱樂部。姿勢分析在瀏覽器內跑（MediaPipe），不需要 GPU 伺服器。

## 試用

上線後網址：https://yurenliuuni.github.io/LS_v0/

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
