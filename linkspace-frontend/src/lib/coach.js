import { angle, visible } from "./pose.js";

const L_SH = 11;
const R_SH = 12;
const L_EL = 13;
const R_EL = 14;
const L_WR = 15;
const R_WR = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_KN = 25;
const R_KN = 26;
const L_AN = 27;
const R_AN = 28;

function clamp(n) {
  return Math.round(Math.max(0, Math.min(100, n)));
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / (values.length || 1);
}

function hipLevel(lm) {
  return 100 - Math.min(40, Math.abs(lm[L_HIP].y - lm[R_HIP].y) * 220);
}

function kneeValgus(lm, side) {
  const hip = side === "L" ? lm[L_HIP] : lm[R_HIP];
  const kn = side === "L" ? lm[L_KN] : lm[R_KN];
  const an = side === "L" ? lm[L_AN] : lm[R_AN];
  const inward = Math.abs(kn.x - (hip.x + an.x) / 2);
  return 100 - Math.min(45, inward * 180);
}

export function scoreExercise(slug, landmarks) {
  if (!landmarks) {
    return { score: 0, cues: ["鏡頭裡看不到完整身體"], ok: false };
  }

  const body = [L_SH, R_SH, L_HIP, R_HIP, L_KN, R_KN];
  if (!visible(landmarks, body)) {
    return {
      score: 12,
      cues: ["請後退一步，讓頭、軀幹、膝蓋都在畫面中"],
      ok: false,
    };
  }

  const scorers = {
    "cat-cow": scoreCatCow,
    "bird-dog": scoreBirdDog,
    bridge: scoreBridge,
    "dead-bug": scoreDeadBug,
    "wall-squat": scoreWallSquat,
    free: scoreFree,
    youtube: scoreFree,
  };

  return (scorers[slug] || scoreFree)(landmarks);
}

function scoreCatCow(lm) {
  const spine = angle(lm[L_SH], lm[L_HIP], lm[L_KN]);
  const elbows = mean([
    angle(lm[L_SH], lm[L_EL], lm[L_WR]),
    angle(lm[R_SH], lm[R_EL], lm[R_WR]),
  ]);
  const cues = [];
  if (spine > 168 && spine < 188) cues.push("再把背部拱起或沉下，做出明顯的貓／牛變化");
  if (elbows < 150) cues.push("手臂打直、肩膀遠離耳朵");
  const motion = Math.min(30, Math.abs(180 - spine) * 1.4);
  const score = clamp(55 + motion + (elbows - 140) * 0.2);
  if (!cues.length) cues.push("很好，跟著呼吸讓脊椎流動");
  return { score, cues, ok: true };
}

function scoreBirdDog(lm) {
  const arms = [angle(lm[L_SH], lm[L_EL], lm[L_WR]), angle(lm[R_SH], lm[R_EL], lm[R_WR])];
  const legs = [angle(lm[L_HIP], lm[L_KN], lm[L_AN]), angle(lm[R_HIP], lm[R_KN], lm[R_AN])];
  const reach = Math.max(...arms) + Math.max(...legs);
  const cues = [];
  if (hipLevel(lm) < 78) cues.push("骨盆轉太多了，想像腰上放一杯水");
  if (Math.max(...legs) < 150) cues.push("後脚再伸直一點");
  const score = clamp(hipLevel(lm) * 0.45 + reach * 0.18);
  if (!cues.length) cues.push("對側手脚延伸，核心穩定");
  return { score, cues, ok: true };
}

function scoreBridge(lm) {
  const left = angle(lm[L_SH], lm[L_HIP], lm[L_KN]);
  const right = angle(lm[R_SH], lm[R_HIP], lm[R_KN]);
  const hip = mean([left, right]);
  const cues = [];
  if (hip < 155) cues.push("把髖再推高，肩—髖—膝成一直線");
  if (hip > 188) cues.push("不要過度挺腰，用臀部發力");
  const valgus = mean([kneeValgus(lm, "L"), kneeValgus(lm, "R")]);
  if (valgus < 70) cues.push("膝蓋不要內夾");
  const score = clamp(100 - Math.abs(170 - hip) * 1.6 + (valgus - 70) * 0.2);
  if (!cues.length) cues.push("頂端停住，臀腿出力");
  return { score, cues, ok: true };
}

function scoreDeadBug(lm) {
  const backArch = Math.abs(lm[L_SH].y - lm[L_HIP].y);
  const cues = [];
  if (backArch > 0.18) cues.push("下背貼地，肋骨往下收");
  const opposite =
    Math.abs(lm[L_WR].y - lm[R_AN].y) + Math.abs(lm[R_WR].y - lm[L_AN].y);
  const score = clamp(88 - backArch * 180 + Math.min(12, opposite * 8));
  if (!cues.length) cues.push("腰貼地，手脚慢慢遠離");
  return { score, cues, ok: true };
}

function scoreWallSquat(lm) {
  const knees = mean([
    angle(lm[L_HIP], lm[L_KN], lm[L_AN]),
    angle(lm[R_HIP], lm[R_KN], lm[R_AN]),
  ]);
  const torso = mean([
    angle(lm[L_SH], lm[L_HIP], lm[L_KN]),
    angle(lm[R_SH], lm[R_HIP], lm[R_KN]),
  ]);
  const cues = [];
  if (knees > 130) cues.push("再往下滑，大腿接近水平");
  if (torso < 155) cues.push("背貼牆，胸口打開");
  const valgus = mean([kneeValgus(lm, "L"), kneeValgus(lm, "R")]);
  if (valgus < 72) cues.push("膝蓋對準腳尖");
  const score = clamp(100 - Math.abs(95 - knees) * 1.1 + (valgus - 70) * 0.25);
  if (!cues.length) cues.push("重量在腳跟，呼吸保持順暢");
  return { score, cues, ok: true };
}

function scoreFree(lm) {
  const knees = mean([
    angle(lm[L_HIP], lm[L_KN], lm[L_AN]),
    angle(lm[R_HIP], lm[R_KN], lm[R_AN]),
  ]);
  const shoulders = Math.abs(lm[L_SH].y - lm[R_SH].y);
  const cues = [];
  if (shoulders > 0.08) cues.push("兩肩放平");
  const score = clamp(70 + (180 - Math.abs(160 - knees)) * 0.12 - shoulders * 80);
  if (!cues.length) cues.push("全身都在畫面裡，動作放慢做清楚");
  return { score, cues, ok: true };
}
