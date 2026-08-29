"""
Pose Similarity Engine

我認為這可能要重新設計，包含用戶與影片畫面中的教練的位置、視角差異，動作識別的視覺功能需要多加心力研究CV and Deep learning 
Compares live pose sequences against reference poses using:
  1. Dynamic Time Warping (DTW) for temporal alignment
     # 例如，你可能做得比參考影片快或慢，DTW 能聰明地將兩個不同長度的動作序列進行時間軸上的對齊，確保「蹲下」是跟「蹲下」比，而不是跟「站起」比。
     # 這可能其實並不需要
  2. Cosine similarity on normalized joint vectors
     # 比較「身體整體的姿態向量」。它會將你全身的骨架（肩膀、手肘等 3D 座標）轉換成一個數學向量，然後計算這個向量與參考動作向量的夾角，夾角越小表示整體姿態越像。
  3. Per-joint angle deviation analysis
     # 這是最「教練式」的分析。它會精確計算出你各個關節（如手肘、膝蓋）當前的彎曲角度，並與參考動作的角度進行比對。這能給出非常具體的改進建議，例如「你的左膝彎曲了 100 度，但應該要 120 度」。
  4. Overall scoring with quality classification
  
"""
import math
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

import numpy as np
from scipy.spatial.distance import cosine
from fastdtw import fastdtw

try:
    from scipy.spatial.distance import euclidean
except ImportError:
    def euclidean(a, b):
        return np.linalg.norm(np.array(a) - np.array(b))

from vision_service import PoseFrame, Landmark3D, PoseQuality, SimilarityResult

logger = logging.getLogger("sportverse.similarity")


@dataclass
class JointAngle:
    """Computed joint angle in degrees."""
    name: str
    angle_deg: float
    confidence: float


class JointAngleCalculator:
    """
    不負責比對，只負責「計算」。它接收一個包含 3D 座標的姿態畫面，然後計算出所有主要關節（肩膀、手肘、膝蓋、臀部）的彎曲角度。
    Compute biomechanical joint angles from 3D landmarks.
    Uses vector cross-product for 3D angle calculation.
    """

    # Landmark index mapping MediaPipe Pose Landmark 編號對照表, 人體姿態關鍵點（Landmarks）
    # 這裡的程式碼只挑選了與動作比對相關的上半身和下半身主要關節，總共 12 個
]



    L_SHOULDER = 11
    R_SHOULDER = 12
    L_ELBOW = 13
    R_ELBOW = 14
    L_WRIST = 15
    R_WRIST = 16
    L_HIP = 23
    R_HIP = 24 
    L_KNEE = 25
    R_KNEE = 26
    L_ANKLE = 27
    R_ANKLE = 28

    @classmethod
    def angle_3d(
        cls,
        a: Landmark3D,
        b: Landmark3D,
        c: Landmark3D,
    ) -> float:
        """
        Calculate angle ABC (at vertex B) in 3D space.
        Returns angle in degrees.
        """
        ba = np.array([a.x - b.x, a.y - b.y, a.z - b.z])
        bc = np.array([c.x - b.x, c.y - b.y, c.z - b.z])

        norm_ba = np.linalg.norm(ba)
        norm_bc = np.linalg.norm(bc)

        if norm_ba < 1e-6 or norm_bc < 1e-6:
            return 0.0

        cos_angle = np.dot(ba, bc) / (norm_ba * norm_bc)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        angle = math.degrees(math.acos(cos_angle))

        return angle

    @classmethod
    def compute_all_angles(cls, frame: PoseFrame) -> Dict[str, float]:
        """
        Compute all major joint angles for a pose frame.
        Returns dict of joint_name -> angle_degrees.
        """
        if len(frame.landmarks) < 29:
            return {}

        lm = frame.landmarks
        angles = {}

        # Shoulder angles (relative to torso)
        angles["left_shoulder"] = cls.angle_3d(lm[cls.L_ELBOW], lm[cls.L_SHOULDER], lm[cls.L_HIP])
        angles["right_shoulder"] = cls.angle_3d(lm[cls.R_ELBOW], lm[cls.R_SHOULDER], lm[cls.R_HIP])

        # Elbow angles
        angles["left_elbow"] = cls.angle_3d(lm[cls.L_SHOULDER], lm[cls.L_ELBOW], lm[cls.L_WRIST])
        angles["right_elbow"] = cls.angle_3d(lm[cls.R_SHOULDER], lm[cls.R_ELBOW], lm[cls.R_WRIST])

        # Hip angles
        angles["left_hip"] = cls.angle_3d(lm[cls.L_SHOULDER], lm[cls.L_HIP], lm[cls.L_KNEE])
        angles["right_hip"] = cls.angle_3d(lm[cls.R_SHOULDER], lm[cls.R_HIP], lm[cls.R_KNEE])

        # Knee angles
        angles["left_knee"] = cls.angle_3d(lm[cls.L_HIP], lm[cls.L_KNEE], lm[cls.L_ANKLE])
        angles["right_knee"] = cls.angle_3d(lm[cls.R_HIP], lm[cls.R_KNEE], lm[cls.R_ANKLE])

        # Wrist angles (simplified)
        angles["left_wrist"] = cls.angle_3d(lm[cls.L_ELBOW], lm[cls.L_WRIST], lm[cls.L_ANKLE])
        angles["right_wrist"] = cls.angle_3d(lm[cls.R_ELBOW], lm[cls.R_WRIST], lm[cls.R_ANKLE])

        return angles


class PoseSimilarityEngine:
    """
    Core similarity engine.
    Compares live pose stream against reference sequence.
    """

    def __init__(
        self,
        vector_weight: float = 0.6,      # Weight for vector similarity
        angle_weight: float = 0.4,        # Weight for joint angle similarity
        dtw_radius: int = 5,              # DTW search radius
        temporal_window_ms: float = 500,  # Max timing deviation allowed
    ):
        self.vector_weight = vector_weight
        self.angle_weight = angle_weight
        self.dtw_radius = dtw_radius
        self.temporal_window_ms = temporal_window_ms

        self.reference_sequence: List[PoseFrame] = []
        self.reference_vectors: List[np.ndarray] = []
        self.reference_angles: List[Dict[str, float]] = []

    def load_reference(self, sequence: List[PoseFrame]) -> None:
        """Pre-compute reference vectors and angles."""
        self.reference_sequence = sequence
        self.reference_vectors = [f.to_normalized_vectors() for f in sequence]
        self.reference_angles = [JointAngleCalculator.compute_all_angles(f) for f in sequence]
        logger.info(f"Loaded reference sequence: {len(sequence)} frames")

    def load_reference_from_video(
        self,
        video_path: str,
        extractor,  # VideoPoseExtractor
        sample_fps: float = 10.0,
    ) -> None:
        """Extract and load reference from video file."""
        sequence = extractor.extract_sequence(video_path, sample_fps=sample_fps)
        self.load_reference(sequence)

    def compute_frame_similarity(
        self,
        live_frame: PoseFrame,
        ref_frame: PoseFrame,
    ) -> Tuple[float, Dict[str, float], Dict[str, float]]:
        """
        Compare two single frames.
        Returns: (overall_score, per_joint_scores, joint_deviations)
        """
        # 1. Vector similarity (cosine on normalized landmarks)
        live_vec = live_frame.to_normalized_vectors().flatten()
        ref_vec = ref_frame.to_normalized_vectors().flatten()

        # Cosine distance -> similarity
        cos_dist = cosine(live_vec, ref_vec)
        vector_sim = max(0, (1 - cos_dist) * 100)

        # 2. Joint angle comparison
        live_angles = JointAngleCalculator.compute_all_angles(live_frame)
        ref_angles = JointAngleCalculator.compute_all_angles(ref_frame)

        per_joint_scores = {}
        deviations = {}
        angle_sims = []

        for joint_name in ref_angles:
            if joint_name not in live_angles:
                continue

            ref_a = ref_angles[joint_name]
            live_a = live_angles[joint_name]

            # Deviation in degrees
            dev = abs(ref_a - live_a)
            deviations[joint_name] = dev

            # Convert deviation to score (0 deviation = 100, 45 deg = 0)
            score = max(0, 100 - (dev / 45.0) * 100)
            per_joint_scores[joint_name] = score
            angle_sims.append(score)

        avg_angle_sim = np.mean(angle_sims) if angle_sims else 50.0

        # Weighted combination
        overall = (vector_sim * self.vector_weight) + (avg_angle_sim * self.angle_weight)

        return overall, per_joint_scores, deviations

    def compute_sequence_similarity(
        self,
        live_sequence: List[PoseFrame],
    ) -> Tuple[float, List[SimilarityResult], np.ndarray]:
        """
        Compare live sequence against reference using DTW alignment.
        Returns: (overall_score, per_frame_results, dtw_path)
        """
        if not self.reference_sequence or not live_sequence:
            return 0.0, [], np.array([])

        # Convert to feature vectors for DTW
        # Feature = flattened normalized landmarks
        live_features = [f.to_normalized_vectors().flatten() for f in live_sequence]
        ref_features = self.reference_vectors

        # DTW alignment
        distance, path = fastdtw(
            live_features,
            ref_features,
            dist=euclidean,
            radius=self.dtw_radius,
        )
        path = np.array(path)

        # Compute per-frame results along DTW path
        results = []
        frame_scores = []

        for live_idx, ref_idx in path:
            if live_idx >= len(live_sequence) or ref_idx >= len(self.reference_sequence):
                continue

            score, per_joint, deviations = self.compute_frame_similarity(
                live_sequence[live_idx],
                self.reference_sequence[ref_idx],
            )

            # Determine quality
            if score >= 95:
                quality = PoseQuality.PERFECT
                feedback = ["Perfect alignment!"]
            elif score >= 80:
                quality = PoseQuality.GOOD
                feedback = ["Good form. Minor adjustments needed."]
            elif score >= 60:
                quality = PoseQuality.FAIR
                feedback = self._generate_feedback(deviations)
            elif score >= 40:
                quality = PoseQuality.POOR
                feedback = self._generate_feedback(deviations)
            else:
                quality = PoseQuality.BAD
                feedback = ["Significant deviation. Check reference pose."]

            # Timing offset
            live_time = live_sequence[live_idx].timestamp
            ref_time = self.reference_sequence[ref_idx].timestamp
            # Normalize: assume reference starts at 0
            if len(self.reference_sequence) > 0:
                ref_time = ref_idx * (1.0 / 10.0)  # Assume 10fps reference
            timing_offset = 0  # Will be computed from actual timestamps

            result = SimilarityResult(
                overall_score=score,
                per_joint_scores=per_joint,
                joint_deviations=deviations,
                timing_offset_ms=timing_offset,
                quality=quality,
                feedback=feedback,
            )
            results.append(result)
            frame_scores.append(score)

        overall = np.mean(frame_scores) if frame_scores else 0.0
        return overall, results, path

    def compute_live_frame(
        self,
        live_frame: PoseFrame,
        current_ref_index: int = 0,
    ) -> SimilarityResult:
        """
        Real-time single-frame comparison against current reference frame.
        Used for streaming feedback during training.
        """
        if not self.reference_sequence or current_ref_index >= len(self.reference_sequence):
            return SimilarityResult(
                overall_score=0,
                per_joint_scores={},
                joint_deviations={},
                timing_offset_ms=0,
                quality=PoseQuality.BAD,
                feedback=["No reference loaded"],
            )

        ref_frame = self.reference_sequence[current_ref_index]
        score, per_joint, deviations = self.compute_frame_similarity(live_frame, ref_frame)

        if score >= 95:
            quality = PoseQuality.PERFECT
            feedback = ["Perfect! Hold this position."]
        elif score >= 80:
            quality = PoseQuality.GOOD
            feedback = ["Good alignment."]
        elif score >= 60:
            quality = PoseQuality.FAIR
            feedback = self._generate_feedback(deviations, top_k=2)
        elif score >= 40:
            quality = PoseQuality.POOR
            feedback = self._generate_feedback(deviations, top_k=3)
        else:
            quality = PoseQuality.BAD
            feedback = ["Check reference pose. Significant deviation detected."]

        return SimilarityResult(
            overall_score=score,
            per_joint_scores=per_joint,
            joint_deviations=deviations,
            timing_offset_ms=0,
            quality=quality,
            feedback=feedback,
        )

    def find_best_reference_frame(
        self,
        live_frame: PoseFrame,
        search_window: int = 10,
        current_index: int = 0,
    ) -> Tuple[int, float]:
        """
        Find the reference frame that best matches current live frame.
        Searches within a window around current_index to handle timing drift.
        """
        if not self.reference_sequence:
            return 0, 0.0

        start = max(0, current_index - search_window // 2)
        end = min(len(self.reference_sequence), current_index + search_window // 2 + 1)

        best_idx = current_index
        best_score = -1

        live_vec = live_frame.to_normalized_vectors().flatten()

        for i in range(start, end):
            ref_vec = self.reference_vectors[i].flatten()
            cos_dist = cosine(live_vec, ref_vec)
            score = (1 - cos_dist) * 100

            if score > best_score:
                best_score = score
                best_idx = i

        return best_idx, best_score

    def _generate_feedback(
        self,
        deviations: Dict[str, float],
        top_k: int = 3,
        threshold: float = 10.0,
    ) -> List[str]:
        """Generate human-readable feedback from joint deviations."""
        # Sort by deviation
        sorted_devs = sorted(deviations.items(), key=lambda x: x[1], reverse=True)
        feedback = []

        for joint_name, dev in sorted_devs[:top_k]:
            if dev < threshold:
                continue

            # Human-friendly joint names
            friendly = joint_name.replace("_", " ").title()

            if dev > 30:
                feedback.append(f"{friendly}: Major deviation ({dev:.1f}°)")
            elif dev > 15:
                feedback.append(f"{friendly}: Moderate deviation ({dev:.1f}°)")
            else:
                feedback.append(f"{friendly}: Slight deviation ({dev:.1f}°)")

        if not feedback:
            feedback = ["Form is acceptable. Focus on stability."]

        return feedback


class RealtimePoseMatcher:
    """
    Stateful matcher for real-time training sessions.
    Handles frame-by-frame matching with temporal tracking.
    """

    def __init__(self, engine: PoseSimilarityEngine, target_fps: float = 10.0):
        self.engine = engine
        self.target_fps = target_fps
        self.current_ref_index = 0
        self.session_scores: List[float] = []
        self.combo_count = 0
        self.best_combo = 0
        self.frame_count = 0
        self.good_frame_count = 0

    def reset(self):
        """Reset session state."""
        self.current_ref_index = 0
        self.session_scores = []
        self.combo_count = 0
        self.best_combo = 0
        self.frame_count = 0
        self.good_frame_count = 0

    def process_frame(self, live_frame: PoseFrame) -> SimilarityResult:
        """
        Process one live frame and advance reference pointer.
        Returns similarity result with live feedback.
        """
        self.frame_count += 1

        # Find best matching reference frame
        best_idx, _ = self.engine.find_best_reference_frame(
            live_frame,
            current_index=self.current_ref_index,
        )
        self.current_ref_index = best_idx

        # Compute similarity
        result = self.engine.compute_live_frame(live_frame, best_idx)
        self.session_scores.append(result.overall_score)

        # Update combo
        if result.overall_score >= 75:
            self.combo_count += 1
            self.good_frame_count += 1
            if self.combo_count > self.best_combo:
                self.best_combo = self.combo_count
        else:
            self.combo_count = 0

        # Advance reference index for next frame (auto-progression)
        # Only advance if similarity is decent (user is keeping up)
        if result.overall_score >= 50 and self.current_ref_index < len(self.engine.reference_sequence) - 1:
            self.current_ref_index += 1

        return result

    def get_session_summary(self) -> Dict:
        """Get end-of-session statistics."""
        if not self.session_scores:
            return {}

        scores = np.array(self.session_scores)
        return {
            "total_frames": self.frame_count,
            "average_score": float(np.mean(scores)),
            "max_score": float(np.max(scores)),
            "min_score": float(np.min(scores)),
            "good_frames": self.good_frame_count,
            "good_frame_pct": (self.good_frame_count / self.frame_count * 100) if self.frame_count > 0 else 0,
            "best_combo": self.best_combo,
            "reference_progress": (self.current_ref_index / len(self.engine.reference_sequence) * 100)
                if self.engine.reference_sequence else 0,
        }