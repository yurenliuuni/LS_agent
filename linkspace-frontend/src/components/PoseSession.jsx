import { useEffect, useRef, useState } from "react";
import { detectPose, drawPose, warmupPose } from "../lib/pose.js";
import { scoreExercise } from "../lib/coach.js";
import { addRecord, addSession } from "../lib/store.js";
import YoutubeEmbed from "./YoutubeEmbed.jsx";

export default function PoseSession({ slug, title, cue, youtubeId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const samplesRef = useRef([]);
  const liveRef = useRef(false);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState("尚未開啟鏡頭");
  const [score, setScore] = useState(0);
  const [cues, setCues] = useState([cue]);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(null);

  useEffect(() => {
    warmupPose().catch(() => {
      setStatus("姿勢模型載入失敗，請重新整理（需要網路）");
    });
    return () => teardown(false);
  }, []);

  useEffect(() => {
    if (!live) return undefined;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [live]);

  const loop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    try {
      const landmarks = await detectPose(video);
      drawPose(canvas.getContext("2d"), landmarks, canvas.width, canvas.height);
      const result = scoreExercise(slug, landmarks);
      samplesRef.current.push(result.score);
      if (samplesRef.current.length > 90) samplesRef.current.shift();
      const avg = Math.round(
        samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length,
      );
      setScore(avg);
      setCues(result.cues);
      setStatus(result.ok ? "LIVE" : "尋找身體中");
    } catch (error) {
      setStatus(error.message || "分析中斷");
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { min: 640, ideal: 1920 },
          height: { min: 480, ideal: 1080 },
        },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      samplesRef.current = [];
      setElapsed(0);
      setStartedAt(Date.now());
      liveRef.current = true;
      setLive(true);
      setStatus("LIVE");
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setStatus("需要鏡頭權限才能評分。請允許相機後再試。");
    }
  };

  const teardown = (persist) => {
    cancelAnimationFrame(rafRef.current);
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    const wasLive = liveRef.current;
    liveRef.current = false;
    if (persist && wasLive && startedAt) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const session = {
        id: crypto.randomUUID(),
        slug,
        title,
        score,
        durationSeconds,
        endedAt: new Date().toISOString(),
      };
      addSession(session);
      addRecord({
        id: session.id,
        type: "session",
        value: score,
        unit: "score",
        note: title,
        recordedAt: session.endedAt,
      });
      setStatus("已結束並寫入紀錄");
    }
    setLive(false);
  };

  const stop = () => teardown(true);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <section className="session">
      <div className="stage">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />
        <div className="stage-guide" aria-hidden="true" />
        {!live ? (
          <div className="stage-empty">
            把鏡頭拉遠，讓頭到腳都在虛線框裡。畫面不會再裁切身體。
          </div>
        ) : null}
      </div>
      <aside className="analysis">
        <YoutubeEmbed videoId={youtubeId} title={title} />
        <p className="live-title">
          <i className={live ? "live-dot" : "ready-dot"} />
          {status}
        </p>
        <div className="score-ring" style={{ "--score": `${score}%` }}>
          <strong>{score}%</strong>
          <small>form</small>
        </div>
        <p className="cue">{cues[0]}</p>
        <p className="clock">
          {minutes}:{seconds}
        </p>
        {live ? (
          <button className="btn danger" type="button" onClick={stop}>
            結束並存檔
          </button>
        ) : (
          <button className="btn" type="button" onClick={start}>
            開啟鏡頭開始評分
          </button>
        )}
      </aside>
    </section>
  );
}
