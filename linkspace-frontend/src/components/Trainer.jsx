import { useEffect, useRef, useState } from "react";
import YoutubePlayer from "./YoutubePlayer.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { addSession } from "../lib/store.js";
import { detectGesture, warmupGestures } from "../lib/gestures.js";

const LAYOUT_KEY = "linksparks.layout";

export default function Trainer({ slug, title, youtubeId, defaultLayout = "standing" }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const rafRef = useRef(0);
  const liveRef = useRef(false);
  const cooldownRef = useRef(0);
  const [layout, setLayout] = useState(defaultLayout);
  const [live, setLive] = useState(false);
  const [statusKey, setStatusKey] = useState("trainer.cameraOff");
  const [gesture, setGesture] = useState("");
  const [startedAt, setStartedAt] = useState(null);

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, layout);
  }, [layout]);

  useEffect(() => {
    warmupGestures().catch(() => {
      setStatusKey("trainer.gestureNet");
    });
    startCamera();
    return () => teardown(false);
  }, []);

  const loop = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    try {
      const next = await detectGesture(video);
      if (next && Date.now() > cooldownRef.current) {
        cooldownRef.current = Date.now() + 1400;
        applyGesture(next);
      }
    } catch {
      /* keep the mirror running even if hands fail */
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const applyGesture = (next) => {
    const player = playerRef.current;
    setGesture(next);
    if (next === "pause") {
      player?.pauseVideo?.();
      setStatusKey("trainer.paused");
    } else if (next === "play") {
      player?.playVideo?.();
      setStatusKey("trainer.playing");
    } else if (next === "switch") {
      setLayout((value) => (value === "standing" ? "mat" : "standing"));
      setStatusKey("trainer.switched");
    } else if (next === "rewind") {
      const current = player?.getCurrentTime?.() ?? 0;
      player?.seekTo?.(Math.max(0, current - 10), true);
      setStatusKey("trainer.rewound");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const node = videoRef.current;
      if (!node) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      node.srcObject = stream;
      node.muted = true;
      await node.play();
      liveRef.current = true;
      setLive(true);
      setStartedAt(Date.now());
      setStatusKey("trainer.mirrorOn");
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setStatusKey("trainer.cameraNeed");
    }
  };

  const teardown = (persist) => {
    cancelAnimationFrame(rafRef.current);
    videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    const wasLive = liveRef.current;
    liveRef.current = false;
    if (persist && wasLive && startedAt) {
      addSession({
        id: crypto.randomUUID(),
        slug,
        title,
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        endedAt: new Date().toISOString(),
      });
    }
    setLive(false);
  };

  return (
    <section className="trainer">
      <div className="trainer-bar">
        <div className="layout-toggle" role="tablist">
          <button
            type="button"
            className={layout === "standing" ? "selected" : ""}
            onClick={() => setLayout("standing")}
          >
            {t("trainer.standing")}
          </button>
          <button
            type="button"
            className={layout === "mat" ? "selected" : ""}
            onClick={() => setLayout("mat")}
          >
            {t("trainer.mat")}
          </button>
        </div>
        <p className="gesture-legend">
          {t("trainer.legend")}
          {gesture ? ` · ${t("trainer.last", { g: t(`gesture.${gesture}`) })}` : ""}
        </p>
        <p className="live-title">
          <i className={live ? "live-dot" : "ready-dot"} />
          {t(statusKey)}
        </p>
        <button className="btn slim ghost" type="button" onClick={() => applyGesture("rewind")}>
          {t("gesture.rewind")}
        </button>
        <button className="btn slim" type="button" onClick={() => teardown(true)}>
          {t("trainer.end")}
        </button>
      </div>
      <div className={`split ${layout}`}>
        <div className="pane mirror">
          <video ref={videoRef} playsInline muted autoPlay />
          {!live ? <div className="pane-empty">{t("trainer.mirror")}</div> : null}
          <span className="pane-label">{t("trainer.you")}</span>
        </div>
        <div className="pane coach">
          <YoutubePlayer videoId={youtubeId} playerRef={playerRef} title={title} />
          <span className="pane-label">{t("trainer.coach")}</span>
        </div>
      </div>
    </section>
  );
}
