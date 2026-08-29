"""
SportVerse — Vision Service
Real-time pose estimation using MediaPipe BlazePose.
Extracts 33 3D landmarks, computes joint angles, and streams annotated frames.
"""
import asyncio
import base64
import json
import logging
import math
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Callable
from enum import Enum

import cv2
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    mp = None

logger = logging.getLogger("sportverse.vision")


class PoseQuality(Enum):
    PERFECT = "perfect"      # > 95%
    GOOD = "good"            # > 80%
    FAIR = "fair"            # > 60%
    POOR = "poor"            # > 40%
    BAD = "bad"              # <= 40%


@dataclass
class Landmark3D:
    """Single 3D landmark from BlazePose."""
    x: float
    y: float
    z: float
    visibility: float = 1.0
    presence: float = 1.0


@dataclass
class PoseFrame:
    """One frame of pose data with 33 landmarks."""
    timestamp: float
    landmarks: List[Landmark3D] = field(default_factory=list)
    image_shape: Tuple[int, int] = (0, 0)  # h, w

    def to_normalized_vectors(self) -> np.ndarray:
        """Convert landmarks to normalized joint vectors (centered at hip center)."""
        if len(self.landmarks) < 33:
            return np.zeros((33, 3))
        pts = np.array([[lm.x, lm.y, lm.z] for lm in self.landmarks])
        # Center at hip midpoint (landmarks 23, 24)
        if len(pts) >= 24:
            center = (pts[23] + pts[24]) / 2
            pts = pts - center
        # Normalize by torso height (nose to hip center)
        if len(pts) >= 24:
            torso_len = np.linalg.norm(pts[0]) + 1e-6
            pts = pts / torso_len
        return pts


@dataclass
class SimilarityResult:
    """Pose similarity analysis result."""
    overall_score: float          # 0-100
    per_joint_scores: Dict[str, float]
    joint_deviations: Dict[str, float]  # degrees
    timing_offset_ms: float
    quality: PoseQuality
    feedback: List[str]


class PoseEstimator:
    """
    MediaPipe BlazePose wrapper.
    Supports both static image and video stream processing.
    """

    # MediaPipe landmark indices
    NOSE = 0
    LEFT_EYE = 2
    RIGHT_EYE = 5
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28

    # Skeleton connections for visualization
    SKELETON_CONNECTIONS = [
        (NOSE, LEFT_EYE), (NOSE, RIGHT_EYE),
        (LEFT_SHOULDER, RIGHT_SHOULDER),
        (LEFT_SHOULDER, LEFT_ELBOW), (RIGHT_SHOULDER, RIGHT_ELBOW),
        (LEFT_ELBOW, LEFT_WRIST), (RIGHT_ELBOW, RIGHT_WRIST),
        (LEFT_SHOULDER, LEFT_HIP), (RIGHT_SHOULDER, RIGHT_HIP),
        (LEFT_HIP, RIGHT_HIP),
        (LEFT_HIP, LEFT_KNEE), (RIGHT_HIP, RIGHT_KNEE),
        (LEFT_KNEE, LEFT_ANKLE), (RIGHT_KNEE, RIGHT_ANKLE),
    ]

    def __init__(
        self,
        static_image_mode: bool = False,
        model_complexity: int = 2,  # 0=light, 1=full, 2=heavy
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        self.static_image_mode = static_image_mode
        self.model_complexity = model_complexity
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence

        self._pose = None
        self._mp_drawing = None
        self._mp_pose = None

        if MEDIAPIPE_AVAILABLE:
            self._mp_pose = mp.solutions.pose
            self._mp_drawing = mp.solutions.drawing_utils
            self._pose = self._mp_pose.Pose(
                static_image_mode=static_image_mode,
                model_complexity=model_complexity,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )
        else:
            logger.warning("MediaPipe not installed. Using mock pose estimator.")

    def process_frame(self, image: np.ndarray) -> Optional[PoseFrame]:
        """
        Process a single BGR image frame.
        Returns PoseFrame with 33 landmarks, or None if no person detected.
        """
        if image is None or image.size == 0:
            return None

        h, w = image.shape[:2]

        if not MEDIAPIPE_AVAILABLE or self._pose is None:
            return self._mock_pose_frame(h, w)

        # MediaPipe expects RGB
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self._pose.process(rgb)

        if not results.pose_landmarks:
            return None

        landmarks = []
        for lm in results.pose_landmarks.landmark:
            landmarks.append(Landmark3D(
                x=lm.x,
                y=lm.y,
                z=lm.z,
                visibility=lm.visibility,
                presence=getattr(lm, 'presence', 1.0),
            ))

        return PoseFrame(
            timestamp=time.time(),
            landmarks=landmarks,
            image_shape=(h, w),
        )

    def draw_skeleton(
        self,
        image: np.ndarray,
        pose_frame: PoseFrame,
        color_good: Tuple[int, int, int] = (23, 94, 84),      # Palo Alto green
        color_bad: Tuple[int, int, int] = (140, 21, 21),      # Cardinal red
        color_mid: Tuple[int, int, int] = (178, 111, 0),      # Gold
        line_thickness: int = 3,
        joint_radius: int = 5,
    ) -> np.ndarray:
        """
        Draw pose skeleton overlay on image.
        Colors indicate alignment quality if per_joint_scores provided.
        """
        if not pose_frame.landmarks:
            return image

        h, w = pose_frame.image_shape
        annotated = image.copy()

        # Default all joints to mid color
        joint_colors = [color_mid] * 33

        # Draw connections
        for conn in self.SKELETON_CONNECTIONS:
            a, b = conn
            if a >= len(pose_frame.landmarks) or b >= len(pose_frame.landmarks):
                continue

            lm_a = pose_frame.landmarks[a]
            lm_b = pose_frame.landmarks[b]

            # Skip low-visibility connections
            if lm_a.visibility < 0.5 or lm_b.visibility < 0.5:
                continue

            pt_a = (int(lm_a.x * w), int(lm_a.y * h))
            pt_b = (int(lm_b.x * w), int(lm_b.y * h))

            cv2.line(annotated, pt_a, pt_b, color_mid, line_thickness, cv2.LINE_AA)

        # Draw joints
        for i, lm in enumerate(pose_frame.landmarks):
            if lm.visibility < 0.5:
                continue
            pt = (int(lm.x * w), int(lm.y * h))
            cv2.circle(annotated, pt, joint_radius, joint_colors[i], -1, cv2.LINE_AA)
            cv2.circle(annotated, pt, joint_radius + 2, (255, 255, 255), 1, cv2.LINE_AA)

        return annotated

    def draw_deviation_overlay(
        self,
        image: np.ndarray,
        pose_frame: PoseFrame,
        deviations: Dict[str, float],
        threshold_good: float = 5.0,
        threshold_mid: float = 15.0,
    ) -> np.ndarray:
        """
        Draw colored deviation rings around joints.
        Green = aligned, Yellow = slight deviation, Red = major deviation.
        """
        h, w = pose_frame.image_shape
        annotated = image.copy()

        joint_map = {
            "left_shoulder": self.LEFT_SHOULDER,
            "right_shoulder": self.RIGHT_SHOULDER,
            "left_elbow": self.LEFT_ELBOW,
            "right_elbow": self.RIGHT_ELBOW,
            "left_wrist": self.LEFT_WRIST,
            "right_wrist": self.RIGHT_WRIST,
            "left_hip": self.LEFT_HIP,
            "right_hip": self.RIGHT_HIP,
            "left_knee": self.LEFT_KNEE,
            "right_knee": self.RIGHT_KNEE,
            "left_ankle": self.LEFT_ANKLE,
            "right_ankle": self.RIGHT_ANKLE,
        }

        for joint_name, dev in deviations.items():
            idx = joint_map.get(joint_name)
            if idx is None or idx >= len(pose_frame.landmarks):
                continue

            lm = pose_frame.landmarks[idx]
            if lm.visibility < 0.5:
                continue

            pt = (int(lm.x * w), int(lm.y * h))

            if dev <= threshold_good:
                color = (23, 94, 84)   # Green
                radius = 12
            elif dev <= threshold_mid:
                color = (0, 165, 255)  # Orange
                radius = 16
            else:
                color = (140, 21, 21)  # Red
                radius = 20

            cv2.circle(annotated, pt, radius, color, 2, cv2.LINE_AA)

        return annotated

    def _mock_pose_frame(self, h: int, w: int) -> PoseFrame:
        """Generate a mock pose frame for testing without MediaPipe."""
        # Simple standing pose
        mock_landmarks = [
            Landmark3D(0.5, 0.15, 0),      # 0 nose
            Landmark3D(0.48, 0.13, 0),     # 1 left eye inner
            Landmark3D(0.47, 0.13, 0),     # 2 left eye
            Landmark3D(0.46, 0.13, 0),     # 3 left eye outer
            Landmark3D(0.52, 0.13, 0),     # 4 right eye inner
            Landmark3D(0.53, 0.13, 0),     # 5 right eye
            Landmark3D(0.54, 0.13, 0),     # 6 right eye outer
            Landmark3D(0.48, 0.14, 0),     # 7 left ear
            Landmark3D(0.52, 0.14, 0),     # 8 right ear
            Landmark3D(0.5, 0.18, 0),      # 9 mouth left
            Landmark3D(0.5, 0.18, 0),      # 10 mouth right
            Landmark3D(0.42, 0.30, 0),     # 11 left shoulder
            Landmark3D(0.58, 0.30, 0),     # 12 right shoulder
            Landmark3D(0.38, 0.45, 0),     # 13 left elbow
            Landmark3D(0.62, 0.45, 0),     # 14 right elbow
            Landmark3D(0.35, 0.58, 0),     # 15 left wrist
            Landmark3D(0.65, 0.58, 0),     # 16 right wrist
            Landmark3D(0.34, 0.60, 0),     # 17 left pinky
            Landmark3D(0.66, 0.60, 0),     # 18 right pinky
            Landmark3D(0.34, 0.59, 0),     # 19 left index
            Landmark3D(0.66, 0.59, 0),     # 20 right index
            Landmark3D(0.35, 0.61, 0),     # 21 left thumb
            Landmark3D(0.65, 0.61, 0),     # 22 right thumb
            Landmark3D(0.44, 0.55, 0),     # 23 left hip
            Landmark3D(0.56, 0.55, 0),     # 24 right hip
            Landmark3D(0.42, 0.72, 0),     # 25 left knee
            Landmark3D(0.58, 0.72, 0),     # 26 right knee
            Landmark3D(0.40, 0.90, 0),     # 27 left ankle
            Landmark3D(0.60, 0.90, 0),     # 28 right ankle
            Landmark3D(0.39, 0.93, 0),     # 29 left heel
            Landmark3D(0.61, 0.93, 0),     # 30 right heel
            Landmark3D(0.40, 0.96, 0),     # 31 left foot index
            Landmark3D(0.60, 0.96, 0),     # 32 right foot index
        ]
        return PoseFrame(
            timestamp=time.time(),
            landmarks=mock_landmarks,
            image_shape=(h, w),
        )

    def close(self):
        if self._pose:
            self._pose.close()


class VideoPoseExtractor:
    """Extract pose sequences from reference video files."""

    def __init__(self, estimator: PoseEstimator):
        self.estimator = estimator

    def extract_sequence(
        self,
        video_path: str,
        sample_fps: float = 10.0,
        max_duration_seconds: float = 60.0,
    ) -> List[PoseFrame]:
        """
        Extract pose frames from a reference video.
        Returns a list of PoseFrames sampled at sample_fps.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(video_fps / sample_fps)
        max_frames = int(max_duration_seconds * video_fps)

        frames = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret or frame_idx >= max_frames:
                break

            if frame_idx % frame_interval == 0:
                pose = self.estimator.process_frame(frame)
                if pose:
                    frames.append(pose)

            frame_idx += 1

        cap.release()
        logger.info(f"Extracted {len(frames)} pose frames from {video_path}")
        return frames

    def extract_from_webcam(
        self,
        duration_seconds: float = 5.0,
        sample_fps: float = 10.0,
        callback: Optional[Callable[[PoseFrame, np.ndarray], None]] = None,
    ) -> List[PoseFrame]:
        """
        Record pose sequence from webcam.
        Optional callback receives each frame with annotated image.
        """
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            raise RuntimeError("Cannot open webcam")

        frames = []
        start_time = time.time()
        interval = 1.0 / sample_fps
        last_capture = 0

        while time.time() - start_time < duration_seconds:
            ret, frame = cap.read()
            if not ret:
                break

            now = time.time()
            if now - last_capture >= interval:
                pose = self.estimator.process_frame(frame)
                if pose:
                    frames.append(pose)
                    if callback:
                        annotated = self.estimator.draw_skeleton(frame, pose)
                        callback(pose, annotated)
                last_capture = now

        cap.release()
        return frames


def encode_frame_to_jpeg(frame: np.ndarray, quality: int = 85) -> bytes:
    """Encode OpenCV frame to JPEG bytes for WebSocket streaming."""
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    success, buffer = cv2.imencode('.jpg', frame, encode_params)
    if not success:
        raise RuntimeError("JPEG encoding failed")
    return buffer.tobytes()


def encode_frame_to_base64(frame: np.ndarray, quality: int = 85) -> str:
    """Encode frame to base64 data URI for frontend display."""
    jpeg = encode_frame_to_jpeg(frame, quality)
    b64 = base64.b64encode(jpeg).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"