import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from pathlib import Path
from config import Config

def get_data_generators(data_dir: str or Path, img_size=(Config.IMG_HEIGHT, Config.IMG_WIDTH), batch_size=Config.BATCH_SIZE):
    """
    Creates train and validation ImageDataGenerators with data augmentation.
    Note: Horizontal flip is set to False because ASL letters (e.g. J, Z, D vs B) have distinct orientation.
    """
    data_dir = Path(data_dir)
    train_dir = data_dir / "train"
    val_dir = data_dir / "validation"
    test_dir = data_dir / "test"

    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=12,
        width_shift_range=0.08,
        height_shift_range=0.08,
        shear_range=0.08,
        zoom_range=0.1,
        fill_mode="nearest"
    )

    val_test_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

    train_gen = None
    val_gen = None
    test_gen = None

    if train_dir.exists():
        train_gen = train_datagen.flow_from_directory(
            train_dir,
            target_size=img_size,
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=True
        )

    if val_dir.exists():
        val_gen = val_test_datagen.flow_from_directory(
            val_dir,
            target_size=img_size,
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=False
        )

    if test_dir.exists():
        test_gen = val_test_datagen.flow_from_directory(
            test_dir,
            target_size=img_size,
            batch_size=batch_size,
            class_mode="categorical",
            shuffle=False
        )

    return train_gen, val_gen, test_gen

def preprocess_input_image(image: np.ndarray, target_size=(Config.IMG_HEIGHT, Config.IMG_WIDTH)) -> np.ndarray:
    """
    Preprocess a raw BGR image array for model inference.
    
    Steps:
    1. Convert BGR to RGB
    2. Resize to target dimension (224x224) using high-quality INTER_AREA
    3. Normalize pixel values to [0.0, 1.0]
    4. Expand dimensions to (1, 224, 224, 3) batch format
    """
    if image is None or image.size == 0:
        raise ValueError("Invalid image input for preprocessing")

    # Convert to RGB
    if len(image.shape) == 2:
        img_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.shape[2] == 4:
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
    else:
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Resize to model input size
    resized = cv2.resize(img_rgb, target_size, interpolation=cv2.INTER_AREA)

    # Normalize to [0, 1]
    normalized = resized.astype(np.float32) / 255.0

    # Expand batch dimension
    batched = np.expand_dims(normalized, axis=0)
    return batched
