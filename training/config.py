from pathlib import Path
from config import Config

class TrainingConfig:
    """Hyperparameters and configuration for training pipeline."""
    MODEL_TYPE = "custom_cnn"  # 'custom_cnn' or 'mobilenetv2'
    IMG_SIZE = (Config.IMG_HEIGHT, Config.IMG_WIDTH)
    BATCH_SIZE = 32
    EPOCHS = 20
    LEARNING_RATE = 1e-4
    EARLY_STOPPING_PATIENCE = 5
    REDUCE_LR_PATIENCE = 3
    REDUCE_LR_FACTOR = 0.5
    MIN_LR = 1e-6
    
    # Model Artifacts
    MODEL_SAVE_PATH = Config.MODEL_PATH
    CLASS_INDICES_PATH = Config.CLASS_INDICES_PATH
    METRICS_OUTPUT_PATH = Config.MODEL_METRICS_PATH
    GRAPHS_DIR = Config.GRAPHS_DIR
