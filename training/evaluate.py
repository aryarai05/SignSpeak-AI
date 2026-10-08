import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support, accuracy_score
import tensorflow as tf
from pathlib import Path
import sys

# Ensure root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import Config
from training.preprocessing import get_data_generators

def evaluate_model(model_path=Config.MODEL_PATH, data_dir=Config.DATASET_DIR, output_dir=Config.RESULTS_DIR):
    """
    Evaluates the trained model on test data, generates confusion matrix plot,
    and writes comprehensive metrics to JSON and text reports.
    """
    print(f"[*] Loading model from {model_path}...")
    model = tf.keras.models.load_model(model_path)

    print(f"[*] Loading test dataset from {data_dir}...")
    _, _, test_gen = get_data_generators(data_dir, batch_size=Config.BATCH_SIZE)

    if test_gen is None or test_gen.samples == 0:
        print("[!] No test dataset found. Falling back to validation set...")
        _, test_gen, _ = get_data_generators(data_dir, batch_size=Config.BATCH_SIZE)
        if test_gen is None or test_gen.samples == 0:
            raise FileNotFoundError(f"Neither test nor validation data found in {data_dir}")

    # Predict on all test samples
    print(f"[*] Running predictions on {test_gen.samples} test images...")
    y_true = test_gen.classes
    class_labels = list(test_gen.class_indices.keys())

    predictions = model.predict(test_gen, verbose=1)
    y_pred = np.argmax(predictions, axis=1)

    # Calculate overall metrics
    overall_acc = accuracy_score(y_true, y_pred)
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)

    # Class-wise report
    clf_report = classification_report(y_true, y_pred, target_names=class_labels, output_dict=True, zero_division=0)
    clf_report_text = classification_report(y_true, y_pred, target_names=class_labels, zero_division=0)

    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)

    # Plot Confusion Matrix
    plt.figure(figsize=(14, 12))
    sns.heatmap(
        cm,
        annot=len(class_labels) <= 30,
        fmt="d",
        cmap="Blues",
        xticklabels=class_labels,
        yticklabels=class_labels,
        cbar_kws={'label': 'Sample Count'}
    )
    plt.title(f"Confusion Matrix - Test Accuracy: {overall_acc * 100:.2f}%", fontsize=14, fontweight="bold", pad=15)
    plt.xlabel("Predicted Class", fontsize=12, labelpad=10)
    plt.ylabel("True Class", fontsize=12, labelpad=10)
    plt.xticks(rotation=45)
    plt.yticks(rotation=0)
    plt.tight_layout()

    cm_save_path = Config.GRAPHS_DIR / "confusion_matrix.png"
    plt.savefig(cm_save_path, dpi=300)
    plt.close()
    print(f"[+] Saved confusion matrix to {cm_save_path}")

    # Save metrics JSON
    metrics_data = {
        "accuracy": round(float(overall_acc) * 100, 2),
        "precision_macro": round(float(prec_macro) * 100, 2),
        "recall_macro": round(float(rec_macro) * 100, 2),
        "f1_macro": round(float(f1_macro) * 100, 2),
        "precision_weighted": round(float(prec_weighted) * 100, 2),
        "recall_weighted": round(float(rec_weighted) * 100, 2),
        "f1_weighted": round(float(f1_weighted) * 100, 2),
        "total_test_samples": int(test_gen.samples),
        "num_classes": len(class_labels),
        "class_labels": class_labels,
        "class_report": clf_report,
        "confusion_matrix": cm.tolist()
    }

    metrics_save_path = Config.MODEL_METRICS_PATH
    with open(metrics_save_path, "w") as f:
        json.dump(metrics_data, f, indent=4)
    print(f"[+] Saved metrics JSON to {metrics_save_path}")

    # Save plain text report
    report_text_path = Config.REPORTS_DIR / "evaluation_report.txt"
    with open(report_text_path, "w") as f:
        f.write("=" * 60 + "\n")
        f.write("      SignSpeak AI - Model Evaluation Summary\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Test Accuracy:         {overall_acc * 100:.2f}%\n")
        f.write(f"Macro Precision:       {prec_macro * 100:.2f}%\n")
        f.write(f"Macro Recall:          {rec_macro * 100:.2f}%\n")
        f.write(f"Macro F1-Score:        {f1_macro * 100:.2f}%\n")
        f.write(f"Total Test Samples:    {test_gen.samples}\n\n")
        f.write("Detailed Class-wise Report:\n")
        f.write("-" * 60 + "\n")
        f.write(clf_report_text + "\n")
    print(f"[+] Saved evaluation report to {report_text_path}")

    return metrics_data

if __name__ == "__main__":
    evaluate_model()
