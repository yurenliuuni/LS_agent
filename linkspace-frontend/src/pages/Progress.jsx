import { loadState, statsFrom } from "../lib/store.js";

export default function Progress() {
  const state = loadState();
  const stats = statsFrom(state);

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>每日紀錄</h2>
        <p>
          已練 {stats.count} 場、{stats.minutes} 分鐘，連續 {stats.streak}{" "}
          天。資料先存在這台裝置，之後可同步帳號。
        </p>
      </div>
      {state.sessions.length === 0 ? (
        <p className="empty">還沒有場次。先去課程頁打開鏡頭練一輪。</p>
      ) : (
        <ol className="session-list">
          {state.sessions.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{new Date(item.endedAt).toLocaleString()}</span>
              </div>
              <b>{item.score}%</b>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
