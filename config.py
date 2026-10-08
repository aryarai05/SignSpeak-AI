import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
DATABASE_DIR = BASE_DIR / "database"
RESULTS_DIR = BASE_DIR / "results"
GRAPHS_DIR = RESULTS_DIR / "graphs"
REPORTS_DIR = RESULTS_DIR / "reports"
DATASET_DIR = BASE_DIR / "dataset"
UPLOADS_DIR = BASE_DIR / "static" / "uploads"

# Ensure runtime directories exist
for folder in [MODELS_DIR, DATABASE_DIR, RESULTS_DIR, GRAPHS_DIR, REPORTS_DIR, DATASET_DIR, UPLOADS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

class Config:
    """Application Configuration Settings"""
    PROJECT_NAME = "SignSpeak AI"
    PROJECT_TAGLINE = "Breaking Communication Barriers with Deep Learning"
    VERSION = "1.0.0"

    # Base Paths
    BASE_DIR = BASE_DIR
    MODELS_DIR = MODELS_DIR
    DATABASE_DIR = DATABASE_DIR
    RESULTS_DIR = RESULTS_DIR
    GRAPHS_DIR = GRAPHS_DIR
    REPORTS_DIR = REPORTS_DIR
    DATASET_DIR = DATASET_DIR
    UPLOADS_DIR = UPLOADS_DIR

    # Secret Key for Flask sessions
    SECRET_KEY = os.environ.get("SECRET_KEY", "signspeak-ai-deep-learning-secret-2026")

    # Model Configuration
    MODEL_PATH = MODELS_DIR / "sign_language_model.keras"
    CLASS_INDICES_PATH = MODELS_DIR / "class_indices.json"
    MODEL_METRICS_PATH = REPORTS_DIR / "metrics.json"

    # Image & Processing Specs
    IMG_HEIGHT = 224
    IMG_WIDTH = 224
    IMG_CHANNELS = 3
    IMG_SHAPE = (IMG_HEIGHT, IMG_WIDTH, IMG_CHANNELS)
    BATCH_SIZE = 32
    DEFAULT_EPOCHS = 20
    LEARNING_RATE = 1e-4

    # Confidence Threshold (Configurable: predictions below this are marked Low Confidence)
    CONFIDENCE_THRESHOLD = 0.70  # 70%

    # ASL Alphabet Classes (Standard 26 letters + special symbols: del, nothing, space)
    # Compatible with Kaggle ASL Alphabet Dataset
    CLASSES = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
        'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
        'U', 'V', 'W', 'X', 'Y', 'Z', 'del', 'nothing', 'space'
    ]
    NUM_CLASSES = len(CLASSES)

    # Database
    DATABASE_PATH = DATABASE_DIR / "predictions.db"

    # Security & File Uploads
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max

    # MediaPipe Hand Detection Config
    MP_MAX_NUM_HANDS = 1
    MP_MIN_DETECTION_CONFIDENCE = 0.6
    MP_MIN_TRACKING_CONFIDENCE = 0.5
    HAND_BBOX_PADDING = 0.25  # 25% padding around hand bounding box for context
