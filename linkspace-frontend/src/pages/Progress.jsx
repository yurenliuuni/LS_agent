import { useState } from "react";
import { clearSessions, deleteSession, loadState, statsFrom } from "../lib/store.js";

export default function Progress() {
  const [state, setState] = useState(loadState());
  const stats = statsFrom(state);

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>History</h2>
        <p>
          {stats.count} sessions, {stats.minutes} minutes, {stats.streak} day streak.
        </p>
        {state.sessions.length > 0 ? (
          <button className="btn ghost" type="button" onClick={() => setState(clearSessions())}>
            Clear all
          </button>
        ) : null}
      </div>
      {state.sessions.length === 0 ? (
        <p className="empty">No sessions yet.</p>
      ) : (
        <ol className="session-list">
          {state.sessions.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{new Date(item.endedAt).toLocaleString()}</span>
              </div>
              <div className="session-actions">
                <b>{Math.round((item.durationSeconds || 0) / 60)} min</b>
                <button
                  className="btn ghost slim"
                  type="button"
                  onClick={() => setState(deleteSession(item.id))}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
