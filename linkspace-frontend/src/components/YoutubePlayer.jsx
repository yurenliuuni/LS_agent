import { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n.jsx";
import { loadYoutubeApi, youtubeThumb, youtubeWatchUrl } from "../lib/youtube.js";

export default function YoutubePlayer({ videoId, playerRef, title }) {
  const { t } = useI18n();
  const boxRef = useRef(null);
  const instanceRef = useRef(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBlocked(false);
    playerRef.current = null;

    loadYoutubeApi().then((YT) => {
      if (cancelled || !boxRef.current) return;
      instanceRef.current?.destroy();
      instanceRef.current = new YT.Player(boxRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
          },
          onError: (event) => {
            if ([2, 5, 100, 101, 150].includes(event.data)) {
              setBlocked(true);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
      playerRef.current = null;
    };
  }, [videoId, playerRef]);

  if (blocked) {
    return (
      <div className="yt-blocked">
        <img src={youtubeThumb(videoId)} alt="" />
        <p>{t("yt.blocked")}</p>
        <a className="btn" href={youtubeWatchUrl(videoId)} target="_blank" rel="noreferrer">
          {t("yt.open", { title: title || t("yt.fallback") })}
        </a>
        <p className="hint">{t("yt.hint")}</p>
      </div>
    );
  }

  return (
    <div className="yt-host">
      <div ref={boxRef} className="yt-host-inner" />
    </div>
  );
}
