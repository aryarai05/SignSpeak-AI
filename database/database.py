import sqlite3
import json
from datetime import datetime
from pathlib import Path
from config import Config

def get_db_connection():
    """Establish and return a connection to the SQLite database with dictionary cursor."""
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables from schema.sql."""
    schema_file = Path(__file__).parent / "schema.sql"
    with open(schema_file, "r") as f:
        schema_sql = f.read()
    
    with get_db_connection() as conn:
        conn.executescript(schema_sql)
        conn.commit()

def insert_prediction(prediction: str, confidence: float, status: str, input_type: str, top_k: list = None, image_path: str = None) -> int:
    """
    Insert a new prediction record into SQLite.
    
    Args:
        prediction: Predicted class label (e.g. 'A')
        confidence: Prediction confidence float (0.0 to 1.0)
        status: 'recognized' or 'low_confidence'
        input_type: 'webcam' or 'upload'
        top_k: List of dicts with top predictions [{'sign': 'A', 'confidence': 0.95}, ...]
        image_path: Optional path to uploaded image
    
    Returns:
        int: The inserted record ID
    """
    top_k_str = json.dumps(top_k) if top_k else None
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO predictions (prediction, confidence, status, input_type, top_k, image_path)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (prediction, round(float(confidence), 4), status, input_type, top_k_str, image_path)
        )
        conn.commit()
        return cursor.lastrowid

def get_recent_predictions(limit: int = 50, offset: int = 0, filter_sign: str = None, filter_input: str = None, filter_status: str = None):
    """Fetch paginated prediction history with optional filters."""
    query = "SELECT * FROM predictions WHERE 1=1"
    params = []

    if filter_sign:
        query += " AND prediction = ?"
        params.append(filter_sign.strip().upper())
    if filter_input:
        query += " AND input_type = ?"
        params.append(filter_input.strip().lower())
    if filter_status:
        query += " AND status = ?"
        params.append(filter_status.strip().lower())

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

        # Count total matching for pagination
        count_query = query.split("ORDER BY")[0].replace("SELECT *", "SELECT COUNT(*)")
        count_params = params[:-2]
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()[0]

    results = []
    for row in rows:
        top_k_val = json.loads(row["top_k"]) if row["top_k"] else []
        results.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "prediction": row["prediction"],
            "confidence": round(row["confidence"] * 100, 2),
            "status": row["status"],
            "input_type": row["input_type"],
            "top_k": top_k_val,
            "image_path": row["image_path"]
        })

    return {"items": results, "total": total_count}

def get_statistics():
    """
    Compute aggregate analytics across all recorded predictions.
    Used for dashboard charts and metrics.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Total predictions
        cursor.execute("SELECT COUNT(*) FROM predictions")
        total_predictions = cursor.fetchone()[0]

        if total_predictions == 0:
            return {
                "total_predictions": 0,
                "average_confidence": 0.0,
                "recognized_count": 0,
                "low_confidence_count": 0,
                "recognition_rate": 0.0,
                "most_recognized_sign": "None",
                "most_recognized_count": 0,
                "distribution_by_sign": {},
                "confidence_distribution": {"<70%": 0, "70-85%": 0, "85-95%": 0, ">95%": 0},
                "input_type_distribution": {"webcam": 0, "upload": 0},
                "recent_trend": []
            }

        # Average confidence
        cursor.execute("SELECT AVG(confidence) FROM predictions")
        avg_confidence = cursor.fetchone()[0] or 0.0

        # Recognized vs Low Confidence
        cursor.execute("SELECT COUNT(*) FROM predictions WHERE status = 'recognized'")
        recognized_count = cursor.fetchone()[0]
        low_confidence_count = total_predictions - recognized_count
        recognition_rate = (recognized_count / total_predictions) * 100

        # Most recognized sign
        cursor.execute(
            """
            SELECT prediction, COUNT(*) as count 
            FROM predictions 
            WHERE status = 'recognized'
            GROUP BY prediction 
            ORDER BY count DESC 
            LIMIT 1
            """
        )
        top_row = cursor.fetchone()
        most_recognized_sign = top_row["prediction"] if top_row else "None"
        most_recognized_count = top_row["count"] if top_row else 0

        # Distribution by Sign
        cursor.execute(
            """
            SELECT prediction, COUNT(*) as count 
            FROM predictions 
            GROUP BY prediction 
            ORDER BY count DESC
            """
        )
        sign_distribution = {row["prediction"]: row["count"] for row in cursor.fetchall()}

        # Confidence distribution buckets
        cursor.execute("SELECT COUNT(*) FROM predictions WHERE confidence < 0.70")
        c_low = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM predictions WHERE confidence >= 0.70 AND confidence < 0.85")
        c_med = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM predictions WHERE confidence >= 0.85 AND confidence < 0.95")
        c_high = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM predictions WHERE confidence >= 0.95")
        c_vhigh = cursor.fetchone()[0]

        # Input type distribution
        cursor.execute("SELECT input_type, COUNT(*) as count FROM predictions GROUP BY input_type")
        input_distribution = {row["input_type"]: row["count"] for row in cursor.fetchall()}

        # Recent trend (last 10 predictions or chronological sequence)
        cursor.execute(
            """
            SELECT id, timestamp, prediction, confidence, status 
            FROM predictions 
            ORDER BY id DESC 
            LIMIT 15
            """
        )
        recent_trend = [
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "prediction": r["prediction"],
                "confidence": round(r["confidence"] * 100, 2),
                "status": r["status"]
            }
            for r in reversed(cursor.fetchall())
        ]

    return {
        "total_predictions": total_predictions,
        "average_confidence": round(avg_confidence * 100, 2),
        "recognized_count": recognized_count,
        "low_confidence_count": low_confidence_count,
        "recognition_rate": round(recognition_rate, 2),
        "most_recognized_sign": most_recognized_sign,
        "most_recognized_count": most_recognized_count,
        "distribution_by_sign": sign_distribution,
        "confidence_distribution": {
            "<70%": c_low,
            "70-85%": c_med,
            "85-95%": c_high,
            ">95%": c_vhigh
        },
        "input_type_distribution": input_distribution,
        "recent_trend": recent_trend
    }

def clear_history():
    """Clear all records from prediction history."""
    with get_db_connection() as conn:
        conn.execute("DELETE FROM predictions")
        conn.commit()

def insert_message(text: str, source: str = "camera") -> int:
    """Save a user-constructed message to SQLite for quick recall."""
    if not text or not text.strip():
        return 0
    words = len(text.strip().split())
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO messages (text, word_count, source)
            VALUES (?, ?, ?)
            """,
            (text.strip(), words, source)
        )
        conn.commit()
        return cursor.lastrowid

def get_recent_messages(limit: int = 8):
    """Retrieve recent saved spoken messages."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, timestamp, text, word_count, source
            FROM messages
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,)
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "text": r["text"],
                "word_count": r["word_count"],
                "source": r["source"]
            }
            for r in rows
        ]

def clear_messages():
    """Clear saved spoken messages."""
    with get_db_connection() as conn:
        conn.execute("DELETE FROM messages")
        conn.commit()
