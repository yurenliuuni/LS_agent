import { useState } from "react";
import { CLUBS } from "../data/programs.js";
import { clubCopy, useI18n } from "../lib/i18n.jsx";
import { joinClub, loadState } from "../lib/store.js";

export default function Club() {
  const { t, lang } = useI18n();
  const [state, setState] = useState(loadState());

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>{t("club.title")}</h2>
        <p>{t("club.lede")}</p>
      </div>
      <div className="program-grid">
        {CLUBS.map((club) => {
          const joined = state.clubs.includes(club.slug);
          const labels = clubCopy(club, lang);
          return (
            <article key={club.slug} className="program-card">
              <span className="mins">{t("club.people", { n: club.members })}</span>
              <h3>{labels.name}</h3>
              <p>{labels.tagline}</p>
              <button
                className="btn"
                disabled={joined}
                onClick={() => setState(joinClub(club.slug))}
              >
                {joined ? t("club.joined") : t("club.join")}
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
}
