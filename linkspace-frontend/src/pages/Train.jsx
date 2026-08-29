import { Link, useParams } from "react-router-dom";
import ProgramCard from "../components/ProgramCard.jsx";
import Trainer from "../components/Trainer.jsx";
import { CATEGORIES, categoryName, findProgram } from "../data/programs.js";
import { useI18n, videoTitle } from "../lib/i18n.jsx";

export default function Train() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const selected = slug ? findProgram(slug) : null;

  if (!selected) {
    return (
      <main>
        <section className="panel">
          <div className="panel-head">
            <h2>{t("train.title")}</h2>
            <p>{t("train.lede")}</p>
          </div>
        </section>
        {CATEGORIES.map((category) => (
          <section className="panel" key={category.slug}>
            <div className="panel-head">
              <h2>{categoryName(category, lang, t)}</h2>
            </div>
            <div className="program-grid">
              {category.videos.map((item) => (
                <ProgramCard key={item.slug} item={item} lang={lang} />
              ))}
            </div>
          </section>
        ))}
      </main>
    );
  }

  return (
    <main className="wide">
      <p className="crumb">
        <Link to="/train">{t("train.crumb")}</Link> / {videoTitle(selected, lang)}
      </p>
      <Trainer
        slug={selected.slug}
        title={videoTitle(selected, lang)}
        youtubeId={selected.youtubeId}
        defaultLayout={selected.defaultLayout}
      />
    </main>
  );
}
