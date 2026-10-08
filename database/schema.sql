-- SignSpeak AI SQLite Database Schema
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    prediction TEXT NOT NULL,
    confidence REAL NOT NULL,
    status TEXT NOT NULL,       -- 'recognized' or 'low_confidence'
    input_type TEXT NOT NULL,   -- 'webcam' or 'signboard' or 'upload'
    top_k TEXT,                 -- JSON formatted string of top predictions
    image_path TEXT             -- Relative path to uploaded image if available
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    text TEXT NOT NULL,
    word_count INTEGER DEFAULT 1,
    source TEXT DEFAULT 'camera' -- 'camera' or 'signboard' or 'quick_phrase'
);

CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_prediction ON predictions(prediction);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
