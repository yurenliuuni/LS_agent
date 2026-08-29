import { useState } from "react";
import Trainer from "../components/Trainer.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { getYoutubeId } from "../lib/youtube.js";

export default function Studio() {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const id = getYoutubeId(draft);
    if (!id) {
      setError(t("studio.error"));
      return;
    }
    setError("");
    setVideoId(id);
  };

  return (
    <main className="wide">
      <section className="panel">
        <div className="panel-head">
          <h2>{t("studio.title")}</h2>
          <p>{t("studio.lede")}</p>
        </div>
        <form className="url-form" onSubmit={submit}>
          <label htmlFor="yt">{t("studio.label")}</label>
          <div className="input-row">
            <input
              id="yt"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <button className="btn" type="submit">
              {t("studio.load")}
            </button>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
      {videoId ? (
        <Trainer
          slug="custom"
          title={t("studio.custom")}
          youtubeId={videoId}
          defaultLayout="standing"
        />
      ) : null}
    </main>
  );
}
