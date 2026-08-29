const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const LINES = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

let landmarkerPromise;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm"
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      const options = {
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      };
      try {
        return await vision.PoseLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        });
      } catch {
        return vision.PoseLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
        });
      }
    })();
  }
  return landmarkerPromise;
}

export async function warmupPose() {
  await getLandmarker();
}

export async function detectPose(video) {
  const landmarker = await getLandmarker();
  const result = landmarker.detectForVideo(video, performance.now());
  return result.landmarks?.[0] ?? null;
}

export function drawPose(ctx, landmarks, width, height) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(110, 214, 220, 0.9)";
  ctx.fillStyle = "rgba(244, 250, 252, 0.95)";
  for (const [a, b] of LINES) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb || (pa.visibility ?? 1) < 0.4 || (pb.visibility ?? 1) < 0.4) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pa.x * width, pa.y * height);
    ctx.lineTo(pb.x * width, pb.y * height);
    ctx.stroke();
  }
  for (const point of landmarks) {
    if ((point.visibility ?? 1) < 0.4) continue;
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function angle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag =
    Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || Number.EPSILON;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

export function visible(landmarks, indexes, min = 0.45) {
  return indexes.every((i) => (landmarks[i]?.visibility ?? 0) >= min);
}
