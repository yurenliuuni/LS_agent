import { useI18n } from "../lib/i18n.jsx";

export default function About() {
  const { t } = useI18n();

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>{t("about.title")}</h2>
      </div>
      <div className="about-copy">
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <p>{t("about.p3")}</p>
        <p>{t("about.p4")}</p>
      </div>
    </main>
  );
}
