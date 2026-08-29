import { useState } from "react";
import PoseSession from "../components/PoseSession.jsx";
import { getYoutubeId } from "../lib/youtube.js";

export default function Studio() {
  const [draft, setDraft] = useState("");
  const [videoId, setVideoId] = useState(null);
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const id = getYoutubeId(draft);
    if (!id) {
      setError("請貼上有效的 YouTube 連結。");
      return;
    }
    setError("");
    setVideoId(id);
  };

  return (
    <main>
      <section className="panel">
        <div className="panel-head">
          <h2>跟任意影片練</h2>
          <p>
            貼上你喜歡的課表。鏡頭會追蹤你的骨架，給你「有沒有做完整、有沒有明顯歪掉」的即時分數。
          </p>
        </div>
        <form className="url-form" onSubmit={submit}>
          <label htmlFor="yt">YouTube 連結</label>
          <div className="input-row">
            <input
              id="yt"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <button className="btn" type="submit">
              載入影片
            </button>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
      {videoId ? (
        <PoseSession
          slug="youtube"
          title="YouTube 跟練"
          cue="盡量讓全身入鏡，跟著影片節奏，不要憋氣。"
          youtubeId={videoId}
        />
      ) : null}
    </main>
  );
}
