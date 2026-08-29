import { useI18n } from "../lib/i18n.jsx";

export default function About() {
  const { t } = useI18n();

  return (
    <main className="panel">
      <div className="panel-head">
        <h2>{t("about.title")}</h2>
      </div>
      <div className="about-copy">
        {["p1", "p2", "p3", "p4", "p5", "p6"].map((key) => (
          <p key={key}>{t(`about.${key}`)}</p>
        ))}
      </div>
    </main>
  );
}
