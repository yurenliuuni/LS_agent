import { NavLink, Outlet } from "react-router-dom";
import logo from "../assets/logo.svg";
import { useI18n } from "../lib/i18n.jsx";
import { loadState, statsFrom } from "../lib/store.js";

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const state = loadState();
  const stats = statsFrom(state);
  const name = state.user?.displayName || state.user?.username || t("account.guest");

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src={logo} alt="" className="brand-logo" />
          linksparks
        </NavLink>
        <nav className="nav">
          <NavLink to="/guide">{t("nav.guide")}</NavLink>
          <NavLink to="/about">{t("nav.about")}</NavLink>
          <NavLink to="/train">{t("nav.train")}</NavLink>
          <NavLink to="/time">{t("nav.time")}</NavLink>
          <NavLink to="/focus">{t("nav.focus")}</NavLink>
          <NavLink to="/studio">{t("nav.studio")}</NavLink>
          <NavLink to="/progress">{t("nav.progress")}</NavLink>
          <NavLink to="/club">{t("nav.club")}</NavLink>
        </nav>
        <div className="top-actions">
          <div className="lang-toggle" role="group" aria-label={lang === "zh" ? "語言" : "Language"}>
            <button
              type="button"
              className={lang === "zh" ? "selected" : ""}
              onClick={() => setLang("zh")}
            >
              {t("lang.zh")}
            </button>
            <button
              type="button"
              className={lang === "en" ? "selected" : ""}
              onClick={() => setLang("en")}
            >
              {t("lang.en")}
            </button>
          </div>
          <NavLink to="/account" className="user-chip">
            {name}
            <small>{t("nav.streak", { n: stats.streak })}</small>
          </NavLink>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <NavLink to="/about">{t("about.title")}</NavLink>
      </footer>
    </div>
  );
}
