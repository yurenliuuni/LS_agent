import { useState } from "react";
import { CLUBS } from "../data/programs.js";
import { joinClub, loadState } from "../lib/store.js";

export default function Club() {
  const [state, setState] = useState(loadState());

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>Clubs</h2>
        <p>Join a crew. Your name shows in the header.</p>
      </div>
      <div className="program-grid">
        {CLUBS.map((club) => {
          const joined = state.clubs.includes(club.slug);
          return (
            <article key={club.slug} className="program-card">
              <span className="mins">{club.members} people</span>
              <h3>{club.name}</h3>
              <p>{club.tagline}</p>
              <button
                className="btn"
                disabled={joined}
                onClick={() => setState(joinClub(club.slug))}
              >
                {joined ? "Joined" : "Join"}
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
}
