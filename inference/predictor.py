import json
import os
import cv2
import numpy as np
import tensorflow as tf
from pathlib import Path
from config import Config
from inference.hand_detector import HandDetector
from inference.gradcam import GradCAM
from training.preprocessing import preprocess_input_image
from database.database import insert_prediction

class SignPredictor:
    """
    Production-grade inference engine for SignSpeak AI.
    Handles Hand Detection, ROI preprocessing, CNN Softmax inference,
    threshold filtering, and Grad-CAM generation.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(SignPredictor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.model = None
        self.class_indices = {}
        self.hand_detector = HandDetector()
        self.gradcam = None
        self.load_model()
        self._initialized = True

    def load_model(self):
        """Loads the TensorFlow/Keras model and class indices if available."""
        if Config.MODEL_PATH.exists():
            try:
                print(f"[*] Loading SignSpeak AI model from {Config.MODEL_PATH}...")
                self.model = tf.keras.models.load_model(str(Config.MODEL_PATH))
                self.gradcam = GradCAM(self.model)
                print("[+] Model loaded successfully!")
            except Exception as e:
                print(f"[!] Warning: Could not load model from {Config.MODEL_PATH}: {e}")
                self.model = None
        else:
            print(f"[!] Model not found at {Config.MODEL_PATH}. Application ready for training.")
            self.model = None

        # Load class mappings
        if Config.CLASS_INDICES_PATH.exists():
            try:
                with open(Config.CLASS_INDICES_PATH, "r") as f:
                    raw_mapping = json.load(f)
                    # Convert keys to int if saved as string
                    self.class_indices = {int(k): v for k, v in raw_mapping.items()}
            except Exception:
                self.class_indices = {i: cls for i, cls in enumerate(Config.CLASSES)}
        else:
            self.class_indices = {i: cls for i, cls in enumerate(Config.CLASSES)}

    def is_model_loaded(self) -> bool:
        if self.model is None and Config.MODEL_PATH.exists():
            self.load_model()
        return self.model is not None

    def predict(
        self,
        image_bgr: np.ndarray,
        input_type: str = "webcam",
        use_hand_detector: bool = True,
        generate_gradcam: bool = False,
        confidence_threshold: float = None,
        save_to_db: bool = True,
        image_path: str = None
    ) -> dict:
        """
        Executes end-to-end inference pipeline on a single image.
        """
        if image_bgr is None or image_bgr.size == 0:
            return {
                "success": False,
                "error": "Empty or invalid image frame received",
                "prediction": "Unknown",
                "confidence": 0.0,
                "status": "error"
            }

        if not self.is_model_loaded():
            return {
                "success": False,
                "error": "Model not loaded. Please train or place model inside models/sign_language_model.keras",
                "prediction": "Unavailable",
                "confidence": 0.0,
                "status": "model_not_loaded"
            }

        threshold = confidence_threshold if confidence_threshold is not None else Config.CONFIDENCE_THRESHOLD

        # Step 1: Hand Detection & Region of Interest (ROI) extraction
        hand_detected = False
        hand_crop = None
        annotated_frame = None
        bbox = None
        landmarks = []

        if use_hand_detector:
            detection_result = self.hand_detector.detect(image_bgr, draw_overlay=True)
            hand_detected = detection_result["hand_detected"]
            hand_crop = detection_result["hand_crop"]
            annotated_frame = detection_result["annotated_frame"]
            bbox = detection_result["bbox"]
            landmarks = detection_result["landmarks"]

        # If hand detected, use hand crop; otherwise use full image
        inference_input = hand_crop if (hand_detected and hand_crop is not None) else image_bgr

        # Step 2: Preprocessing (Resize to 224x224, Normalize, Batch dim)
        try:
            preprocessed = preprocess_input_image(inference_input, (Config.IMG_HEIGHT, Config.IMG_WIDTH))
        except Exception as e:
            return {
                "success": False,
                "error": f"Image preprocessing failed: {str(e)}",
                "prediction": "Error",
                "confidence": 0.0,
                "status": "error"
            }

        # Step 3: Deep Learning Model Softmax Classification
        raw_predictions = self.model.predict(preprocessed, verbose=0)[0]
        predicted_idx = int(np.argmax(raw_predictions))
        confidence = float(raw_predictions[predicted_idx])
        predicted_sign = self.class_indices.get(predicted_idx, "Unknown")

        # Step 4: Top-K Predictions (Top-5)
        top_indices = np.argsort(raw_predictions)[::-1][:5]
        top_k = []
        for idx in top_indices:
            top_k.append({
                "sign": self.class_indices.get(int(idx), str(idx)),
                "confidence": round(float(raw_predictions[idx]) * 100, 2),
                "probability": float(raw_predictions[idx])
            })

        # Step 5: Confidence Threshold Verification
        is_recognized = (confidence >= threshold)
        status = "recognized" if is_recognized else "low_confidence"
        status_message = "Sign Recognized" if is_recognized else "Low Confidence — Reposition hand"

        # Step 6: Grad-CAM Explainable AI (if requested)
        gradcam_uri = None
        if generate_gradcam and self.gradcam:
            try:
                heatmap = self.gradcam.generate_heatmap(preprocessed, class_index=predicted_idx)
                _, gradcam_uri = self.gradcam.overlay_heatmap(
                    cv2.resize(inference_input, (Config.IMG_WIDTH, Config.IMG_HEIGHT)),
                    heatmap
                )
            except Exception as e:
                print(f"[!] Grad-CAM generation error: {e}")

        # Step 7: Save to Database
        db_id = None
        if save_to_db:
            try:
                db_id = insert_prediction(
                    prediction=predicted_sign,
                    confidence=confidence,
                    status=status,
                    input_type=input_type,
                    top_k=top_k[:3],
                    image_path=image_path
                )
            except Exception as e:
                print(f"[!] Database insert error: {e}")

        return {
            "success": True,
            "id": db_id,
            "prediction": predicted_sign,
            "confidence": round(confidence * 100, 2),
            "raw_confidence": confidence,
            "status": status,
            "status_message": status_message,
            "threshold": round(threshold * 100, 2),
            "hand_detected": hand_detected,
            "bbox": bbox,
            "top_k": top_k,
            "gradcam_image": gradcam_uri
        }
