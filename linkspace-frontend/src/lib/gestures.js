const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

let recognizerPromise;

async function getRecognizer() {
  if (!recognizerPromise) {
    recognizerPromise = (async () => {
      const vision = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm"
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      return vision.GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
      });
    })().catch(async () => {
      const vision = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm"
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      return vision.GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 1,
      });
    });
  }
  return recognizerPromise;
}

export async function warmupGestures() {
  await getRecognizer();
}

export async function detectGesture(video) {
  const recognizer = await getRecognizer();
  const result = recognizer.recognizeForVideo(video, performance.now());
  const gesture = result.gestures?.[0]?.[0];
  if (!gesture || gesture.score < 0.7) return null;
  return mapGesture(gesture.categoryName);
}

function mapGesture(name) {
  if (name === "Open_Palm") return "pause";
  if (name === "Thumb_Up") return "play";
  if (name === "Victory" || name === "ILoveYou") return "switch";
  return null;
}
