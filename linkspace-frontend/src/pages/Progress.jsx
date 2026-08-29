import { useState } from "react";
import { useI18n } from "../lib/i18n.jsx";
import { clearSessions, deleteSession, loadState, statsFrom } from "../lib/store.js";

export default function Progress() {
  const { t, lang } = useI18n();
  const [state, setState] = useState(loadState());
  const stats = statsFrom(state);
  const locale = lang === "zh" ? "zh-Hant" : "en-US";

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>{t("progress.title")}</h2>
        <p>
          {t("progress.summary", {
            count: stats.count,
            minutes: stats.minutes,
            streak: stats.streak,
          })}
        </p>
        {state.sessions.length > 0 ? (
          <button className="btn ghost" type="button" onClick={() => setState(clearSessions())}>
            {t("progress.clear")}
          </button>
        ) : null}
      </div>
      {state.sessions.length === 0 ? (
        <p className="empty">{t("progress.empty")}</p>
      ) : (
        <ol className="session-list">
          {state.sessions.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{new Date(item.endedAt).toLocaleString(locale)}</span>
              </div>
              <div className="session-actions">
                <b>{Math.round((item.durationSeconds || 0) / 60)} min</b>
                <button
                  className="btn ghost slim"
                  type="button"
                  onClick={() => setState(deleteSession(item.id))}
                >
                  {t("progress.delete")}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
