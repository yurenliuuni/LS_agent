import { useState } from "react";
import Trainer from "../components/Trainer.jsx";
import { getYoutubeId } from "../lib/youtube.js";

export default function Studio() {
  const [draft, setDraft] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const id = getYoutubeId(draft);
    if (!id) {
      setError("Paste a YouTube URL.");
      return;
    }
    setError("");
    setVideoId(id);
  };

  return (
    <main className="wide">
      <section className="panel">
        <div className="panel-head">
          <h2>Paste a YouTube link</h2>
          <p>
            Pamela Reif is the main catalog. If a pasted video is blocked by YouTube,
            pick one from Train instead.
          </p>
        </div>
        <form className="url-form" onSubmit={submit}>
          <label htmlFor="yt">YouTube URL</label>
          <div className="input-row">
            <input
              id="yt"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <button className="btn" type="submit">
              Load
            </button>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
      {videoId ? (
        <Trainer
          slug="custom"
          title="Custom YouTube"
          youtubeId={videoId}
          defaultLayout="standing"
        />
      ) : null}
    </main>
  );
}
