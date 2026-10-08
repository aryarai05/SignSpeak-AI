import os
import sys
import shutil
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import Config

def download_asl_dataset():
    """
    Downloads or provides clear instructions for fetching the full ASL Alphabet dataset.
    The ASL Alphabet dataset by Akash (Kaggle) contains 87,000 200x200 images for 29 classes.
    """
    print("=" * 65)
    print("   SignSpeak AI - ASL Alphabet Dataset Setup Utility")
    print("=" * 65)

    print("\nDataset: ASL Alphabet (29 classes: A-Z, del, nothing, space)")
    print("Source: https://www.kaggle.com/datasets/grassknoted/asl-alphabet\n")

    # Check if kagglehub is installed
    try:
        import kagglehub
        print("[*] Attempting automatic download via kagglehub...")
        path = kagglehub.dataset_download("grassknoted/asl-alphabet")
        print(f"[+] Dataset downloaded to temporary cache: {path}")

        # Link or copy into dataset directory
        source_train = Path(path) / "asl_alphabet_train" / "asl_alphabet_train"
        target_train = Config.DATASET_DIR / "train"

        if source_train.exists():
            print(f"[*] Moving classes into {target_train}...")
            shutil.copytree(source_train, target_train, dirs_exist_ok=True)
            print("[+] Train dataset successfully staged!")
            return True
    except Exception as e:
        print(f"[!] Note: Automatic download via kagglehub requires kaggle credentials or package: {e}")

    print("\n" + "-" * 65)
    print("MANUAL DOWNLOAD INSTRUCTIONS:")
    print("-" * 65)
    print("1. Visit: https://www.kaggle.com/datasets/grassknoted/asl-alphabet")
    print("2. Click 'Download' (approx. 1.0 GB zip).")
    print("3. Unzip the downloaded file.")
    print("4. Place the subfolders into your project's dataset directory:")
    print(f"     {Config.DATASET_DIR / 'train'}/")
    print("       ├── A/")
    print("       ├── B/")
    print("       ├── ...")
    print("       └── space/")
    print("5. Optional: Split 10% into dataset/validation/ and dataset/test/.")
    print("6. Run: python training/train.py --epochs 15 --model_type custom_cnn")
    print("-" * 65 + "\n")
    return False

if __name__ == "__main__":
    download_asl_dataset()
