import GestureCards from "../components/GestureCards.jsx";
import { useI18n } from "../lib/i18n.jsx";

export default function Guide() {
  const { t } = useI18n();

  return (
    <main>
      <section className="panel">
        <div className="panel-head">
          <h2>{t("guide.title")}</h2>
          <p>{t("guide.lede")}</p>
        </div>
        <GestureCards />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>{t("guide.tipTitle")}</h2>
        </div>
        <ul className="about-list">
          <li>{t("guide.tip1")}</li>
          <li>{t("guide.tip2")}</li>
          <li>{t("guide.tip3")}</li>
        </ul>
      </section>
    </main>
  );
}
