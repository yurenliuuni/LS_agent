import { useEffect, useRef, useState } from "react";
import YoutubePlayer from "./YoutubePlayer.jsx";
import { addSession } from "../lib/store.js";
import { detectGesture, warmupGestures } from "../lib/gestures.js";

const LAYOUT_KEY = "linksparks.layout";

export default function Trainer({ slug, title, youtubeId, defaultLayout = "standing" }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const rafRef = useRef(0);
  const liveRef = useRef(false);
  const cooldownRef = useRef(0);
  const [layout, setLayout] = useState(defaultLayout);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState("Camera off");
  const [gesture, setGesture] = useState("");
  const [startedAt, setStartedAt] = useState(null);

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, layout);
  }, [layout]);

  useEffect(() => {
    warmupGestures().catch(() => {
      setStatus("Gestures need the camera and a network connection.");
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
      setStatus("Paused");
    } else if (next === "play") {
      player?.playVideo?.();
      setStatus("Playing");
    } else if (next === "switch") {
      setLayout((value) => (value === "standing" ? "mat" : "standing"));
      setStatus("Layout switched");
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
      setStatus("Mirror on");
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setStatus("Allow the camera to use the mirror.");
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
            Standing · left / right
          </button>
          <button
            type="button"
            className={layout === "mat" ? "selected" : ""}
            onClick={() => setLayout("mat")}
          >
            Mat · top / bottom
          </button>
        </div>
        <p className="gesture-legend">
          Open palm pause · thumbs up play · peace switch layout
          {gesture ? ` · last: ${gesture}` : ""}
        </p>
        <p className="live-title">
          <i className={live ? "live-dot" : "ready-dot"} />
          {status}
        </p>
        <button className="btn slim" type="button" onClick={() => teardown(true)}>
          End session
        </button>
      </div>
      <div className={`split ${layout}`}>
        <div className="pane mirror">
          <video ref={videoRef} playsInline muted autoPlay />
          {!live ? <div className="pane-empty">Mirror</div> : null}
          <span className="pane-label">You</span>
        </div>
        <div className="pane coach">
          <YoutubePlayer videoId={youtubeId} playerRef={playerRef} title={title} />
          <span className="pane-label">Pamela</span>
        </div>
      </div>
    </section>
  );
}
