import argparse
import json
import os
import sys
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import tensorflow as tf

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import Config
from training.models import build_custom_cnn, build_mobilenetv2
from training.preprocessing import get_data_generators
from training.evaluate import evaluate_model

def plot_training_curves(history, output_dir=Config.GRAPHS_DIR):
    """Generates and saves publication-quality training & validation curves."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    epochs = range(1, len(history.history["accuracy"]) + 1)

    # 1. Accuracy Plot
    plt.figure(figsize=(9, 6))
    plt.plot(epochs, history.history["accuracy"], "b-o", linewidth=2, label="Training Accuracy")
    if "val_accuracy" in history.history:
        plt.plot(epochs, history.history["val_accuracy"], "g-s", linewidth=2, label="Validation Accuracy")
    plt.title("SignSpeak AI - Training & Validation Accuracy", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Accuracy", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(loc="lower right", fontsize=11)
    plt.tight_layout()
    acc_path = output_dir / "training_accuracy.png"
    plt.savefig(acc_path, dpi=300)
    plt.close()
    print(f"[+] Saved accuracy plot to {acc_path}")

    # 2. Loss Plot
    plt.figure(figsize=(9, 6))
    plt.plot(epochs, history.history["loss"], "r-o", linewidth=2, label="Training Loss")
    if "val_loss" in history.history:
        plt.plot(epochs, history.history["val_loss"], "m-s", linewidth=2, label="Validation Loss")
    plt.title("SignSpeak AI - Training & Validation Loss", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Loss (Categorical Crossentropy)", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(loc="upper right", fontsize=11)
    plt.tight_layout()
    loss_path = output_dir / "training_loss.png"
    plt.savefig(loss_path, dpi=300)
    plt.close()
    print(f"[+] Saved loss plot to {loss_path}")

def train(model_type="custom_cnn", epochs=20, batch_size=32, lr=1e-4, data_dir=Config.DATASET_DIR):
    """
    Main training routine for SignSpeak AI.
    """
    print("=" * 60)
    print(f"[*] Starting SignSpeak AI Training Pipeline")
    print(f"[*] Model Architecture: {model_type.upper()}")
    print(f"[*] Epochs: {epochs} | Batch Size: {batch_size} | Learning Rate: {lr}")
    print(f"[*] Dataset Directory: {data_dir}")
    print("=" * 60)

    train_gen, val_gen, test_gen = get_data_generators(data_dir, batch_size=batch_size)

    if train_gen is None or train_gen.samples == 0:
        raise FileNotFoundError(
            f"No training images found in {data_dir / 'train'}. "
            f"Please populate the dataset using scripts/generate_sample_dataset.py or download the ASL Alphabet dataset."
        )

    num_classes = train_gen.num_classes
    class_indices = train_gen.class_indices
    # Invert mapping: index -> class label
    index_to_class = {v: k for k, v in class_indices.items()}

    # Save class indices for inference
    with open(Config.CLASS_INDICES_PATH, "w") as f:
        json.dump(index_to_class, f, indent=4)
    print(f"[+] Saved class mapping ({num_classes} classes) to {Config.CLASS_INDICES_PATH}")

    # Build model
    if model_type.lower() == "mobilenetv2":
        model = build_mobilenetv2(
            input_shape=(Config.IMG_HEIGHT, Config.IMG_WIDTH, Config.IMG_CHANNELS),
            num_classes=num_classes,
            learning_rate=lr
        )
    else:
        model = build_custom_cnn(
            input_shape=(Config.IMG_HEIGHT, Config.IMG_WIDTH, Config.IMG_CHANNELS),
            num_classes=num_classes,
            learning_rate=lr
        )

    model.summary()

    # Callbacks
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss" if val_gen else "loss",
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss" if val_gen else "loss",
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1
        ),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(Config.MODEL_PATH),
            monitor="val_accuracy" if val_gen else "accuracy",
            save_best_only=True,
            verbose=1
        )
    ]

    # Model training
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=epochs,
        callbacks=callbacks,
        verbose=1
    )

    # Save final model
    model.save(str(Config.MODEL_PATH))
    print(f"[+] Trained model saved successfully to: {Config.MODEL_PATH}")

    # Plot metrics
    plot_training_curves(history)

    # Run evaluation if test or validation data exists
    if test_gen is not None and test_gen.samples > 0:
        print("[*] Running final evaluation on test set...")
        evaluate_model(model_path=Config.MODEL_PATH, data_dir=data_dir)
    elif val_gen is not None and val_gen.samples > 0:
        print("[*] Running final evaluation on validation set...")
        evaluate_model(model_path=Config.MODEL_PATH, data_dir=data_dir)

    print("\n[+] Training pipeline completed successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SignSpeak AI Deep Learning Model")
    parser.add_argument("--model_type", type=str, default="custom_cnn", choices=["custom_cnn", "mobilenetv2"], help="Architecture to train")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--data_dir", type=str, default=str(Config.DATASET_DIR), help="Dataset root directory")
    args = parser.parse_args()

    train(
        model_type=args.model_type,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        data_dir=args.data_dir
    )
