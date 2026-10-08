import os
import json
import base64
import time
import cv2
import numpy as np
from flask import Blueprint, render_template, request, jsonify, current_app
from werkzeug.utils import secure_filename
from pathlib import Path

from config import Config
from inference.predictor import SignPredictor
from database.database import (
    get_recent_predictions,
    get_statistics,
    clear_history,
    insert_message,
    get_recent_messages,
    clear_messages
)

api_bp = Blueprint("api", __name__)
predictor = SignPredictor()

def allowed_file(filename: str) -> bool:
    """Check if uploaded file has an allowed image extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decodes a base64 string or data URI to OpenCV BGR numpy array."""
    if "," in base64_str:
        base64_str = base64_str.split(",", 1)[1]
    
    img_bytes = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img_bgr

# ================= PAGE ROUTES =================

@api_bp.route("/")
def index():
    """Vibrant Landing Page — 'Turn Your Signs Into Words'"""
    return render_template("index.html")

@api_bp.route("/sign")
@api_bp.route("/live")
def sign():
    """Main Signing Workspace — Camera + Sign Board + Text + Speech"""
    return render_template("sign.html")

@api_bp.route("/alphabet")
def alphabet():
    """Visual Sign Alphabet & Sign Meaning Reference Library"""
    return render_template("alphabet.html")

@api_bp.route("/dashboard")
def dashboard():
    """User Accessibility Dashboard & Saved Messages"""
    return render_template("dashboard.html")

@api_bp.route("/about")
def about():
    """About SignSpeak AI — Purpose & Accessibility Mission"""
    return render_template("about.html")

@api_bp.route("/results/<path:filename>")
def serve_results(filename):
    """Serve generated assets."""
    from flask import send_from_directory
    return send_from_directory(Config.RESULTS_DIR, filename)

# ================= MESSAGE API ENDPOINTS =================

@api_bp.route("/api/messages/save", methods=["POST"])
def save_message_api():
    """Save user-constructed message for history and replaying."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()
        source = data.get("source", "camera")
        if not text:
            return jsonify({"success": False, "error": "Empty message"}), 400
        msg_id = insert_message(text, source)
        return jsonify({"success": True, "id": msg_id, "text": text})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/api/messages/recent", methods=["GET"])
def recent_messages_api():
    """Fetch recent saved spoken messages."""
    try:
        limit = min(int(request.args.get("limit", 10)), 50)
        messages = get_recent_messages(limit=limit)
        return jsonify({"success": True, "messages": messages})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/api/messages/clear", methods=["POST", "DELETE"])
def clear_messages_api():
    """Clear saved spoken messages."""
    try:
        clear_messages()
        return jsonify({"success": True, "message": "Messages cleared successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ================= RECOGNITION API ENDPOINTS =================

@api_bp.route("/api/predict", methods=["POST"])
def predict_frame():
    """
    Endpoint for real-time webcam frame inference.
    Accepts JSON payload: { 'image': '<base64_string>', 'threshold': 0.70 }
    """
    start_time = time.time()
    try:
        data = request.get_json(silent=True)
        if not data or "image" not in data:
            return jsonify({"success": False, "error": "No image payload provided"}), 400

        img_bgr = decode_base64_image(data["image"])
        if img_bgr is None:
            return jsonify({"success": False, "error": "Could not decode image"}), 400

        threshold = float(data.get("threshold", Config.CONFIDENCE_THRESHOLD))
        use_hand = bool(data.get("use_hand_detector", True))

        # Run inference
        result = predictor.predict(
            image_bgr=img_bgr,
            input_type="webcam",
            use_hand_detector=use_hand,
            generate_gradcam=False,
            confidence_threshold=threshold,
            save_to_db=bool(data.get("save_to_db", True))
        )

        latency_ms = round((time.time() - start_time) * 1000, 1)
        result["latency_ms"] = latency_ms

        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": f"Server processing error: {str(e)}"}), 500

@api_bp.route("/api/predict/image", methods=["POST"])
def predict_image_upload():
    """
    Endpoint for uploaded image file recognition.
    Accepts multipart/form-data with 'image' file and optional 'threshold', 'gradcam'.
    """
    start_time = time.time()
    try:
        if "image" not in request.files:
            return jsonify({"success": False, "error": "No image file provided in request"}), 400

        file = request.files["image"]
        if file.filename == "":
            return jsonify({"success": False, "error": "No selected file"}), 400

        if not allowed_file(file.filename):
            return jsonify({"success": False, "error": f"Unsupported format. Allowed: {', '.join(Config.ALLOWED_EXTENSIONS)}"}), 400

        # Read file bytes into OpenCV
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img_bgr = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return jsonify({"success": False, "error": "Failed to decode uploaded image"}), 400

        threshold = float(request.form.get("threshold", Config.CONFIDENCE_THRESHOLD))
        generate_gradcam = request.form.get("gradcam", "false").lower() == "true"
        use_hand = request.form.get("use_hand_detector", "true").lower() == "true"

        # Save uploaded file for preview/record
        filename = f"{int(time.time())}_{secure_filename(file.filename)}"
        saved_rel_path = f"uploads/{filename}"
        saved_abs_path = Config.UPLOADS_DIR / filename
        cv2.imwrite(str(saved_abs_path), img_bgr)

        # Run prediction
        result = predictor.predict(
            image_bgr=img_bgr,
            input_type="upload",
            use_hand_detector=use_hand,
            generate_gradcam=generate_gradcam,
            confidence_threshold=threshold,
            save_to_db=True,
            image_path=saved_rel_path
        )

        latency_ms = round((time.time() - start_time) * 1000, 1)
        result["latency_ms"] = latency_ms
        result["uploaded_image_url"] = f"/static/uploads/{filename}"

        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": f"Upload processing error: {str(e)}"}), 500

@api_bp.route("/api/explain", methods=["POST"])
def explain_prediction():
    """
    Generate Explainable AI Grad-CAM heatmap for a given image or last upload.
    """
    try:
        data = request.get_json(silent=True)
        if not data or "image" not in data:
            return jsonify({"success": False, "error": "Image required"}), 400

        img_bgr = decode_base64_image(data["image"])
        if img_bgr is None:
            return jsonify({"success": False, "error": "Invalid image"}), 400

        result = predictor.predict(
            image_bgr=img_bgr,
            input_type="explain",
            use_hand_detector=False,
            generate_gradcam=True,
            save_to_db=False
        )

        return jsonify({
            "success": True,
            "prediction": result["prediction"],
            "confidence": result["confidence"],
            "gradcam_image": result.get("gradcam_image")
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/api/history", methods=["GET"])
def history():
    """Get paginated and filtered prediction records."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = int(request.args.get("offset", 0))
        filter_sign = request.args.get("sign")
        filter_input = request.args.get("input_type")
        filter_status = request.args.get("status")

        data = get_recent_predictions(
            limit=limit,
            offset=offset,
            filter_sign=filter_sign,
            filter_input=filter_input,
            filter_status=filter_status
        )
        return jsonify({"success": True, **data})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/api/history/clear", methods=["DELETE", "POST"])
def clear_history_api():
    """Clear all records from prediction history."""
    try:
        clear_history()
        return jsonify({"success": True, "message": "Prediction history cleared successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/api/statistics", methods=["GET"])
def statistics():
    """Aggregate statistics for dashboard metrics and visualizations."""
    try:
        stats = get_statistics()
        return jsonify({"success": True, "statistics": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/api/model-info", methods=["GET"])
def model_info():
    """Retrieve metadata about the currently deployed model and evaluation metrics."""
    try:
        is_loaded = predictor.is_model_loaded()
        metrics = {}
        if Config.MODEL_METRICS_PATH.exists():
            try:
                with open(Config.MODEL_METRICS_PATH, "r") as f:
                    metrics = json.load(f)
            except Exception:
                pass

        total_params = 0
        trainable_params = 0
        if is_loaded and predictor.model:
            total_params = predictor.model.count_params()
            trainable_params = sum(int(np.prod(v.shape)) for v in predictor.model.trainable_weights)

        info = {
            "model_loaded": is_loaded,
            "model_path": str(Config.MODEL_PATH),
            "architecture": "Custom Deep CNN (4 Conv Blocks + BatchNorm + GAP + Dense)" if "custom" in str(Config.MODEL_PATH).lower() else "MobileNetV2 Transfer Learning",
            "input_shape": [Config.IMG_HEIGHT, Config.IMG_WIDTH, Config.IMG_CHANNELS],
            "total_parameters": int(total_params),
            "trainable_parameters": int(trainable_params),
            "num_classes": len(predictor.class_indices),
            "classes": list(predictor.class_indices.values()),
            "confidence_threshold": Config.CONFIDENCE_THRESHOLD,
            "metrics": metrics
        }
        return jsonify({"success": True, "info": info})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": Config.PROJECT_NAME,
        "version": Config.VERSION,
        "model_loaded": predictor.is_model_loaded(),
        "timestamp": time.time()
    })
