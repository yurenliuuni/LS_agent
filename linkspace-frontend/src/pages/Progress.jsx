import { useState } from "react";
import { clearSessions, deleteSession, loadState, statsFrom } from "../lib/store.js";

export default function Progress() {
  const [state, setState] = useState(loadState());
  const stats = statsFrom(state);

  const removeOne = (id) => {
    setState(deleteSession(id));
  };

  const removeAll = () => {
    if (!window.confirm("確定清空這台裝置上的所有場次？")) return;
    setState(clearSessions());
  };

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>每日紀錄</h2>
        <p>
          已練 {stats.count} 場、{stats.minutes} 分鐘，連續 {stats.streak}{" "}
          天。資料先存在這台裝置。
        </p>
        {state.sessions.length > 0 ? (
          <button className="btn ghost" type="button" onClick={removeAll}>
            清空全部
          </button>
        ) : null}
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
              <div className="session-actions">
                <b>{item.score}%</b>
                <button
                  className="btn ghost slim"
                  type="button"
                  onClick={() => removeOne(item.id)}
                >
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
