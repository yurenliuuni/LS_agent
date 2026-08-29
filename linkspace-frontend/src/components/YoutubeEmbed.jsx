import { youtubeEmbedUrl, youtubeWatchUrl } from "../lib/youtube.js";

export default function YoutubeEmbed({ videoId, title }) {
  if (!videoId) return null;
  return (
    <div className="yt-wrap">
      <iframe
        title={title || "coach video"}
        src={youtubeEmbedUrl(videoId)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
      <a className="yt-fallback" href={youtubeWatchUrl(videoId)} target="_blank" rel="noreferrer">
        若畫面空白，改在 YouTube 開啟
      </a>
    </div>
  );
}
