import { useState } from "react";
import { CLUBS } from "../data/programs.js";
import { joinClub, loadState } from "../lib/store.js";

export default function Club() {
  const [state, setState] = useState(loadState());

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>俱樂部</h2>
        <p>同一個時間、同一套動作。先加入，練完會出現在你的身分列。</p>
      </div>
      <div className="program-grid">
        {CLUBS.map((club) => {
          const joined = state.clubs.includes(club.slug);
          return (
            <article key={club.slug} className="program-card">
              <span className="mins">{club.members} 人</span>
              <h3>{club.name}</h3>
              <p>{club.tagline}</p>
              <button
                className="btn"
                disabled={joined}
                onClick={() => setState(joinClub(club.slug))}
              >
                {joined ? "已加入" : "加入"}
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
}
