# SignSpeak AI — Model Weights Directory

This directory houses trained TensorFlow/Keras neural network weights and class index lookup files for inference.

## Expected Files

- `sign_language_model.keras`: Trained deep learning model file (Custom Deep CNN or MobileNetV2).
- `class_indices.json`: JSON dictionary mapping categorical output indices (0–28) to ASL class labels (`A`, `B`, ..., `Z`, `del`, `nothing`, `space`).

## How to Generate or Train

To train the model from scratch on the dataset:

```bash
# 1. Custom Deep CNN (Recommended for Viva and Explainability)
python training/train.py --model_type custom_cnn --epochs 15 --batch_size 32

# 2. MobileNetV2 (Transfer Learning for Edge Performance)
python training/train.py --model_type mobilenetv2 --epochs 15 --batch_size 32
```

## Git LFS Instructions (For GitHub)

If your `.keras` model file exceeds GitHub's 100MB limit:

```bash
git lfs install
git lfs track "*.keras"
git add .gitattributes
git add models/sign_language_model.keras
git commit -m "Add model weights using Git LFS"
```
