import os
import re
import base64
import logging
import pickle
import numpy as np
import cv2
from typing import List, Tuple, Optional, Dict

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
ENCODINGS_DIR = os.path.join(BASE_DIR, "encodings")
ENCODINGS_FILE = os.path.join(ENCODINGS_DIR, "encodings.pkl")

os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(ENCODINGS_DIR, exist_ok=True)

LOCAL_CASCADE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "haarcascade_frontalface_default.xml")

# Allowed student_id characters — alphanumeric plus dash/underscore only
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,64}$")

try:
    # pyrefly: ignore [missing-import]
    import face_recognition
    USE_FACE_RECOGNITION_LIB = True
except ImportError:
    USE_FACE_RECOGNITION_LIB = False
    logger.warning("face_recognition library unavailable — falling back to OpenCV Haar cascade.")


def _validate_student_id(student_id: str) -> str:
    """
    Validate that a student_id is safe for use as a filesystem path component.
    Raises ValueError on invalid input to prevent path traversal.
    """
    if not _SAFE_ID_RE.match(student_id):
        raise ValueError(f"Invalid student_id format: {student_id!r}")
    return student_id


def base64_to_image(base64_string: str) -> Optional[np.ndarray]:
    """Decode a base64 image string (with or without data URI prefix) into an OpenCV BGR array."""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",", 1)[1]
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        logger.debug("Failed to decode base64 image", exc_info=True)
        return None


def detect_face(image: np.ndarray) -> bool:
    """Return True if at least one face is detected in the image."""
    if USE_FACE_RECOGNITION_LIB:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return len(face_recognition.face_locations(rgb)) > 0
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(LOCAL_CASCADE_PATH)
    return len(cascade.detectMultiScale(gray, 1.1, 3)) > 0


def check_blur(image: np.ndarray, threshold: float = 15.0) -> bool:
    """
    Return True if the image is sharp enough for recognition.
    Uses Laplacian variance; threshold lowered for typical webcam quality.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var() >= threshold


def get_face_encoding(image: np.ndarray) -> Optional[np.ndarray]:
    """Return the primary face encoding from an image, or None if no face is found."""
    if USE_FACE_RECOGNITION_LIB:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb)
        return encodings[0] if encodings else None

    # OpenCV fallback: flatten normalised face ROI as a simple feature vector
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(LOCAL_CASCADE_PATH)
    faces = cascade.detectMultiScale(gray, 1.1, 3)
    if len(faces) == 0:
        return None
    x, y, w, h = faces[0]
    roi = cv2.resize(gray[y:y + h, x:x + w], (128, 128))
    return roi.flatten().astype(np.float64) / 255.0


def check_duplicate_face(
    encoding: np.ndarray,
    existing_encodings: Dict[str, List[np.ndarray]],
    exclude_student_id: Optional[str] = None,
    tolerance: float = 0.6,
) -> Optional[str]:
    """
    Check whether a face encoding already belongs to a registered student.
    Returns the conflicting student_id, or None if no duplicate found.
    """
    for student_id, enc_list in existing_encodings.items():
        if student_id == exclude_student_id:
            continue
        for stored in enc_list:
            if USE_FACE_RECOGNITION_LIB:
                if face_recognition.compare_faces([stored], encoding, tolerance=tolerance)[0]:
                    return student_id
            else:
                similarity = np.corrcoef(encoding, stored)[0, 1]
                if similarity > 0.75:
                    return student_id
    return None


def save_face_images(student_id: str, images: List[str]) -> Tuple[int, str]:
    """
    Persist validated face images for a student.
    Returns (number_saved, folder_path).
    """
    _validate_student_id(student_id)
    student_folder = os.path.join(DATASET_DIR, student_id)
    # Verify the resolved path is actually inside DATASET_DIR (belt-and-suspenders)
    if not os.path.realpath(student_folder).startswith(os.path.realpath(DATASET_DIR)):
        raise ValueError("Resolved student folder is outside the dataset directory.")

    os.makedirs(student_folder, exist_ok=True)
    existing_count = len([f for f in os.listdir(student_folder) if f.lower().endswith(".jpg")])
    saved = 0

    for i, img_b64 in enumerate(images):
        try:
            img = base64_to_image(img_b64)
            if img is None or not detect_face(img) or not check_blur(img):
                continue
            filename = f"{student_id}_{existing_count + saved + 1}.jpg"
            cv2.imwrite(os.path.join(student_folder, filename), img)
            saved += 1
        except Exception:
            logger.warning("Could not save image %d for student %s", i, student_id, exc_info=True)

    return saved, student_folder


def train_encodings() -> Tuple[int, int]:
    """
    Build face encodings from all images in the dataset directory and persist them.
    Returns (students_processed, total_encodings).
    """
    if not os.path.isdir(DATASET_DIR):
        return 0, 0

    known_encodings: List[np.ndarray] = []
    known_ids: List[str] = []
    students_processed = 0

    for entry in os.scandir(DATASET_DIR):
        if not entry.is_dir():
            continue
        student_id = entry.name
        has_encoding = False

        for img_entry in os.scandir(entry.path):
            if not img_entry.name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            try:
                img = cv2.imread(img_entry.path)
                if img is None:
                    continue
                enc = get_face_encoding(img)
                if enc is not None:
                    known_encodings.append(enc)
                    known_ids.append(student_id)
                    has_encoding = True
            except Exception:
                logger.warning("Error encoding %s", img_entry.path, exc_info=True)

        if has_encoding:
            students_processed += 1

    with open(ENCODINGS_FILE, "wb") as f:
        pickle.dump({"encodings": known_encodings, "ids": known_ids}, f, protocol=pickle.HIGHEST_PROTOCOL)

    logger.info("Training complete: %d students, %d encodings.", students_processed, len(known_encodings))
    return students_processed, len(known_encodings)


def load_encodings() -> Optional[Dict]:
    """Load persisted face encodings. Returns None if the file is absent or corrupt."""
    if not os.path.isfile(ENCODINGS_FILE):
        return None
    try:
        with open(ENCODINGS_FILE, "rb") as f:
            data = pickle.load(f)
        if not isinstance(data, dict) or "encodings" not in data or "ids" not in data:
            logger.error("Encodings file has unexpected structure.")
            return None
        return data
    except Exception:
        logger.exception("Failed to load encodings file.")
        return None


def recognize_face(image: np.ndarray) -> Tuple[Optional[str], float]:
    """
    Identify a face from an image using stored encodings.
    Returns (student_id, confidence_pct) or (None, 0.0) when unrecognized.
    """
    data = load_encodings()
    if not data or not data["encodings"]:
        return None, 0.0

    encoding = get_face_encoding(image)
    if encoding is None:
        return None, 0.0

    if USE_FACE_RECOGNITION_LIB:
        distances = face_recognition.face_distance(data["encodings"], encoding)
        matches = face_recognition.compare_faces(data["encodings"], encoding, tolerance=0.6)
        if True in matches:
            best = int(np.argmin(distances))
            if matches[best]:
                return data["ids"][best], round((1.0 - distances[best]) * 100, 2)
    else:
        best_sim = 0.0
        best_id = None
        for stored, sid in zip(data["encodings"], data["ids"]):
            sim = float(np.corrcoef(encoding, stored)[0, 1])
            if sim > best_sim:
                best_sim = sim
                best_id = sid
        if best_sim > 0.75:
            return best_id, round(best_sim * 100, 2)

    return None, 0.0


def get_all_encodings_by_student() -> Dict[str, List[np.ndarray]]:
    """Return encodings grouped by student_id for duplicate-face checks."""
    data = load_encodings()
    if not data:
        return {}
    result: Dict[str, List[np.ndarray]] = {}
    for enc, sid in zip(data["encodings"], data["ids"]):
        result.setdefault(sid, []).append(enc)
    return result


def delete_student_images(student_id: str) -> bool:
    """Delete all stored face images for a student. Returns True on success."""
    import shutil
    _validate_student_id(student_id)
    folder = os.path.join(DATASET_DIR, student_id)
    if os.path.isdir(folder):
        shutil.rmtree(folder)
        return True
    return False
