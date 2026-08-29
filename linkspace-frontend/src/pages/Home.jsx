import { Link } from "react-router-dom";
import { PROGRAMS } from "../data/programs.js";
import { loadState, statsFrom } from "../lib/store.js";

export default function Home() {
  const stats = statsFrom(loadState());

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">雲宇 · 線上運動教練</p>
        <h1>
          在家運動時，
          <em>像有人盯著你的動作。</em>
        </h1>
        <p className="lede">
          給久坐的你：打開鏡頭，跟著指定復健動作或任意 YouTube
          課表練習。即時骨架評分，把「怕做錯、不敢練」變成每天 15 分鐘。
        </p>
        <div className="cta-row">
          <Link className="btn" to="/train">
            開始下背修復課
          </Link>
          <Link className="btn ghost" to="/studio">
            貼 YouTube 跟練
          </Link>
        </div>
        <ul className="stat-row">
          <li>
            <b>{stats.count}</b>
            <span>完成場次</span>
          </li>
          <li>
            <b>{stats.avg || "—"}</b>
            <span>平均姿勢分</span>
          </li>
          <li>
            <b>{stats.minutes}</b>
            <span>累積分鐘</span>
          </li>
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>本週楔子：5 個指定動作</h2>
          <p>不是任意影片大海撈針。先把這五個做對，再談社交與遊戲。</p>
        </div>
        <div className="program-grid">
          {PROGRAMS.map((item) => (
            <Link key={item.slug} className="program-card" to={`/train/${item.slug}`}>
              <span className="mins">{item.minutes} min</span>
              <h3>{item.title}</h3>
              <p>{item.english}</p>
              <small>{item.cue}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="steps">
        <article>
          <span>01</span>
          <h3>選一個動作</h3>
          <p>貓牛、鳥狗、橋式、死蟲、靠牆深蹲。每個 3–4 分鐘。</p>
        </article>
        <article>
          <span>02</span>
          <h3>讓全身入鏡</h3>
          <p>筆電或外接鏡頭放在 2–3 公尺處，側向或正面皆可。</p>
        </article>
        <article>
          <span>03</span>
          <h3>看即時回饋</h3>
          <p>骨架疊圖 + 常見錯誤提示。做完會寫進你的每日紀錄。</p>
        </article>
      </section>
    </main>
  );
}
