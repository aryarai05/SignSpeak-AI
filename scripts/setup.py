import os
import sys
import subprocess
from pathlib import Path

# Add project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import Config
from database.database import init_db, insert_prediction, get_statistics

def run_step(step_name, func):
    print(f"\n[>] {step_name}...")
    try:
        func()
        print(f"[OK] {step_name} completed.")
        return True
    except Exception as e:
        print(f"[FAILED] {step_name} failed: {e}")
        return False

def check_dependencies():
    import tensorflow as tf
    import cv2
    import mediapipe as mp
    import flask
    import sklearn
    from importlib.metadata import version
    print(f"    - TensorFlow: {tf.__version__}")
    print(f"    - OpenCV: {cv2.__version__}")
    print(f"    - MediaPipe: {mp.__version__}")
    print(f"    - Flask: {version('flask')}")
    print(f"    - Scikit-Learn: {sklearn.__version__}")

def setup_database():
    init_db()
    print("    - SQLite tables initialized at:", Config.DATABASE_PATH)

def prepare_dataset_and_model():
    # 1. Dataset
    train_dir = Config.DATASET_DIR / "train"
    has_dataset = train_dir.exists() and any(f.is_dir() for f in train_dir.iterdir())

    if not has_dataset:
        print("    - No dataset detected. Generating baseline ASL benchmark dataset...")
        from scripts.generate_sample_dataset import create_sample_dataset
        create_sample_dataset()
    else:
        print("    - Existing dataset verified.")

    # 2. Model
    if not Config.MODEL_PATH.exists():
        print("    - No trained model detected. Launching deep learning training pipeline...")
        from training.train import train
        train(model_type="custom_cnn", epochs=6, batch_size=32, lr=1e-3)
    else:
        print("    - Existing trained model detected at:", Config.MODEL_PATH)

def test_inference_and_db():
    from inference.predictor import SignPredictor
    predictor = SignPredictor()
    assert predictor.is_model_loaded(), "Model failed to load into memory"
    print("    - SignPredictor initialized and weights loaded.")

    # Insert sample demonstration records if database is empty
    stats = get_statistics()
    if stats["total_predictions"] == 0:
        print("    - Populating initial demonstration records into SQLite...")
        insert_prediction("A", 0.9742, "recognized", "upload", [{"sign": "A", "confidence": 97.42}, {"sign": "E", "confidence": 1.25}, {"sign": "S", "confidence": 0.65}])
        insert_prediction("B", 0.9482, "recognized", "webcam", [{"sign": "B", "confidence": 94.82}, {"sign": "D", "confidence": 3.12}, {"sign": "F", "confidence": 1.05}])
        insert_prediction("C", 0.9137, "recognized", "webcam", [{"sign": "C", "confidence": 91.37}, {"sign": "O", "confidence": 5.41}, {"sign": "G", "confidence": 1.10}])
        insert_prediction("L", 0.9854, "recognized", "upload", [{"sign": "L", "confidence": 98.54}, {"sign": "D", "confidence": 0.82}, {"sign": "I", "confidence": 0.35}])
        insert_prediction("Y", 0.9520, "recognized", "webcam", [{"sign": "Y", "confidence": 95.20}, {"sign": "I", "confidence": 2.15}, {"sign": "J", "confidence": 1.12}])
        insert_prediction("Z", 0.5820, "low_confidence", "webcam", [{"sign": "Z", "confidence": 58.20}, {"sign": "D", "confidence": 22.40}, {"sign": "J", "confidence": 10.15}])

def main():
    print("=" * 65)
    print("   SignSpeak AI — Full System Setup & Verification")
    print("=" * 65)

    if not run_step("Checking Core Dependencies", check_dependencies):
        sys.exit(1)
    if not run_step("Initializing SQLite Database", setup_database):
        sys.exit(1)
    if not run_step("Verifying Dataset and Model", prepare_dataset_and_model):
        sys.exit(1)
    if not run_step("Validating Inference Engine & Database", test_inference_and_db):
        sys.exit(1)

    print("\n" + "=" * 65)
    print("   [SUCCESS] SignSpeak AI is FULLY CONFIGURED and READY TO RUN!")
    print("   Run the server using:")
    print("   python app.py")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    main()
