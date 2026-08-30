const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const PINKY_MCP = 17;

let recognizerPromise;

async function getRecognizer() {
  if (!recognizerPromise) {
    recognizerPromise = (async () => {
      const vision = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm"
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      try {
        return await vision.GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      } catch {
        return vision.GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      }
    })();
  }
  return recognizerPromise;
}

export async function warmupGestures() {
  await getRecognizer();
}

export async function detectGesture(video) {
  const recognizer = await getRecognizer();
  const result = recognizer.recognizeForVideo(video, performance.now());
  const hands = result.landmarks?.filter((hand) => hand?.length >= 21) ?? [];
  if (isTimeoutT(hands)) return "pause";
  return pickSingleHand(result.gestures);
}

function pickSingleHand(gestures) {
  let best = null;
  for (const hand of gestures ?? []) {
    const top = hand?.[0];
    if (!top || top.score < 0.75) continue;
    const mapped = mapSingle(top.categoryName);
    if (!mapped) continue;
    if (!best || top.score > best.score) best = { mapped, score: top.score };
  }
  return best?.mapped ?? null;
}

function mapSingle(name) {
  if (name === "Thumb_Up") return "play";
  if (name === "Victory" || name === "ILoveYou") return "switch";
  if (name === "Thumb_Down" || name === "Pointing_Up") return "rewind";
  return null;
}

function isTimeoutT(hands) {
  if (hands.length < 2) return false;
  const [a, b] = hands;
  const axisA = axis(a);
  const axisB = axis(b);
  let bar;
  let stem;
  if (isHorizontal(axisA) && isVertical(axisB)) {
    bar = a;
    stem = b;
  } else if (isHorizontal(axisB) && isVertical(axisA)) {
    bar = b;
    stem = a;
  } else {
    return false;
  }
  const center = palmCenter(bar);
  const tip = stem[MIDDLE_TIP];
  const wrist = stem[WRIST];
  const tipToBar = dist(tip, center);
  const wristToBar = dist(wrist, center);
  return tipToBar < 0.16 && tipToBar < wristToBar * 0.8;
}

function axis(hand) {
  return {
    x: hand[MIDDLE_MCP].x - hand[WRIST].x,
    y: hand[MIDDLE_MCP].y - hand[WRIST].y,
  };
}

function isHorizontal(vec) {
  return Math.abs(vec.x) > Math.abs(vec.y) * 1.2;
}

function isVertical(vec) {
  return Math.abs(vec.y) > Math.abs(vec.x) * 1.2;
}

function palmCenter(hand) {
  return {
    x: (hand[WRIST].x + hand[INDEX_MCP].x + hand[MIDDLE_MCP].x + hand[PINKY_MCP].x) / 4,
    y: (hand[WRIST].y + hand[INDEX_MCP].y + hand[MIDDLE_MCP].y + hand[PINKY_MCP].y) / 4,
  };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
