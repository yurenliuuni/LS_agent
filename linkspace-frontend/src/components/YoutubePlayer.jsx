import { useEffect, useRef, useState } from "react";
import { loadYoutubeApi, youtubeThumb, youtubeWatchUrl } from "../lib/youtube.js";

export default function YoutubePlayer({ videoId, playerRef, title }) {
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
        <p>YouTube blocked embedding for this video.</p>
        <a className="btn" href={youtubeWatchUrl(videoId)} target="_blank" rel="noreferrer">
          Open {title || "this workout"} on YouTube
        </a>
        <p className="hint">Use a Pamela session from Train — those are checked for embed.</p>
      </div>
    );
  }

  return (
    <div className="yt-host">
      <div ref={boxRef} className="yt-host-inner" />
    </div>
  );
}
