import { Link, useParams } from "react-router-dom";
import ProgramCard from "../components/ProgramCard.jsx";
import {
  FOCUS_COLLECTIONS,
  TIME_COLLECTIONS,
  videosForFocus,
  videosForTime,
} from "../data/programs.js";
import { useI18n } from "../lib/i18n.jsx";

export default function Collection({ kind }) {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const collections = kind === "time" ? TIME_COLLECTIONS : FOCUS_COLLECTIONS;
  const selected = slug ? collections.find((item) => item.slug === slug) : null;
  const videos = selected
    ? kind === "time"
      ? videosForTime(selected.slug)
      : videosForFocus(selected.slug)
    : [];

  if (!selected) {
    return (
      <main>
        <section className="panel">
          <div className="panel-head">
            <h2>{t(kind === "time" ? "collection.timeIndex" : "collection.focusIndex")}</h2>
            <p>{t(kind === "time" ? "collection.timeLede" : "collection.focusLede")}</p>
          </div>
          <div className="collection-grid">
            {collections.map((item) => {
              const count =
                kind === "time" ? videosForTime(item.slug).length : videosForFocus(item.slug).length;
              return (
                <Link key={item.slug} className="collection-card" to={`/${kind}/${item.slug}`}>
                  <span className="mins">{t("collection.workouts", { n: count })}</span>
                  <h3>{t(item.nameKey)}</h3>
                  <p>{t(item.blurbKey)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <p className="crumb">
        <Link to={`/${kind}`}>{t(kind === "time" ? "collection.backTime" : "collection.backFocus")}</Link>
        {" / "}
        {t(selected.nameKey)}
      </p>
      <section className="panel">
        <div className="panel-head">
          <h2>{t(selected.nameKey)}</h2>
          <p>{t(selected.blurbKey)}</p>
        </div>
        <div className="program-grid">
          {videos.map((item) => (
            <ProgramCard key={item.slug} item={item} lang={lang} />
          ))}
        </div>
      </section>
    </main>
  );
}
