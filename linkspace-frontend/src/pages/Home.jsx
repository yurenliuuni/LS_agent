import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";
import ProgramCard from "../components/ProgramCard.jsx";
import {
  CATEGORIES,
  FOCUS_COLLECTIONS,
  TIME_COLLECTIONS,
  categoryName,
  suggestedTimeSlug,
  videosForFocus,
  videosForTime,
} from "../data/programs.js";
import { useI18n } from "../lib/i18n.jsx";
import { loadState, statsFrom } from "../lib/store.js";

export default function Home() {
  const { t, lang } = useI18n();
  const stats = statsFrom(loadState());
  const nowSlug = suggestedTimeSlug();
  const now = TIME_COLLECTIONS.find((item) => item.slug === nowSlug);

  return (
    <main>
      <section className="hero">
        <img src={logo} alt="linksparks" className="hero-logo" />
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1>{t("home.title")}</h1>
        <p className="lede">{t("home.lede")}</p>
        <div className="cta-row">
          <Link className="btn" to="/guide">
            {t("home.guide")}
          </Link>
          <Link className="btn ghost" to="/train">
            {t("home.browse")}
          </Link>
          <Link className="btn ghost" to="/about">
            {t("nav.about")}
          </Link>
        </div>
        <ul className="stat-row">
          <li>
            <b>{stats.count}</b>
            <span>{t("home.sessions")}</span>
          </li>
          <li>
            <b>{stats.minutes}</b>
            <span>{t("home.minutes")}</span>
          </li>
        </ul>
      </section>

      {now ? (
        <section className="panel now-panel">
          <div className="panel-head">
            <p className="eyebrow">{t("home.nowFit")}</p>
            <h2>{t(now.nameKey)}</h2>
            <p>{t(now.blurbKey)}</p>
          </div>
          <Link className="btn ghost" to={`/time/${now.slug}`}>
            {t("collection.workouts", { n: videosForTime(now.slug).length })}
          </Link>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>{t("home.byTime")}</h2>
          <p>{t("home.byTimeHint")}</p>
        </div>
        <div className="collection-grid">
          {TIME_COLLECTIONS.map((item) => (
            <Link key={item.slug} className="collection-card" to={`/time/${item.slug}`}>
              <span className="mins">{t("collection.workouts", { n: videosForTime(item.slug).length })}</span>
              <h3>{t(item.nameKey)}</h3>
              <p>{t(item.blurbKey)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>{t("home.byFocus")}</h2>
          <p>{t("home.byFocusHint")}</p>
        </div>
        <div className="collection-grid">
          {FOCUS_COLLECTIONS.map((item) => (
            <Link key={item.slug} className="collection-card" to={`/focus/${item.slug}`}>
              <span className="mins">{t("collection.workouts", { n: videosForFocus(item.slug).length })}</span>
              <h3>{t(item.nameKey)}</h3>
              <p>{t(item.blurbKey)}</p>
            </Link>
          ))}
        </div>
      </section>

      {CATEGORIES.map((category) => (
        <section className="panel" key={category.slug}>
          <div className="panel-head">
            <p className="eyebrow">{t("home.quick")}</p>
            <h2>{categoryName(category, lang, t)}</h2>
            <p>
              {t("home.defaultLayout", {
                layout: t(category.defaultLayout === "standing" ? "home.standing" : "home.mat"),
              })}
            </p>
          </div>
          <div className="program-grid">
            {category.videos.slice(0, 4).map((item) => (
              <ProgramCard key={item.slug} item={item} lang={lang} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
