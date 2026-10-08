# System Architecture & Technical Specifications

## SignSpeak AI: Real-Time Sign Language Recognition System

---

## 1. High-Level Architecture Flowchart

```
┌────────────────────────────────────────────────────────┐
│                      Client Tier                       │
│    • Modern Glassmorphic Web UI (HTML5 / CSS3 / JS)    │
│    • Real-Time HTML5 MediaStream Camera Feed           │
│    • Drag-and-Drop Image Analysis Dropzone             │
│    • Interactive HUD with Target Detection Bracket    │
│    • Text Builder Studio with Web Speech Audio Synthes │
└───────────────────────────┬────────────────────────────┘
                            │ Asynchronous HTTP / REST
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Application Tier                     │
│    • Flask Web Application & RESTful API Blueprint    │
│    • Error Handlers (400, 404, 413, 500 Sanitization)  │
│    • Base64 Image Frame Decoding (OpenCV)              │
│    • Configurable Confidence Threshold Engine          │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│     Computer Vision Tier     │ │     Data Telemetry Tier      │
│  • MediaPipe Hands Tracking  │ │  • SQLite (predictions.db)   │
│  • 21 3D Coordinate Mapping  │ │  • Timestamps, Top-K Logs    │
│  • Contextual 25% ROI Padding│ │  • Chart.js Aggregations     │
│  • Square Aspect Rescaling   │ │  • CSV Export Generator      │
└──────────────┬───────────────┘ └──────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────┐
│                  Deep Learning Tier                    │
│  • Preprocessing (224×224 Normalization to [0, 1])     │
│  • Model A: Custom Deep CNN (4 Conv Blocks, BN, GAP)   │
│  • Model B: MobileNetV2 (ImageNet Transfer Learning)   │
│  • Softmax Probability Distribution (29 Classes)       │
│  • Grad-CAM Explainable AI (Target Conv Layer Grads)   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Deep Learning Pipeline Specifications

### 2.1 Model A: Custom Deep Convolutional Neural Network
Designed from first principles to extract spatial sign features without excessive FLOPs:
- **Input Layer:** `(224, 224, 3)` normalized RGB tensors.
- **Conv Block 1:** `Conv2D(32, 3x3)` -> `BatchNorm` -> `Conv2D(32, 3x3)` -> `BatchNorm` -> `MaxPool(2x2)` -> `Dropout(0.2)`.
- **Conv Block 2:** `Conv2D(64, 3x3)` -> `BatchNorm` -> `Conv2D(64, 3x3)` -> `BatchNorm` -> `MaxPool(2x2)` -> `Dropout(0.25)`.
- **Conv Block 3:** `Conv2D(128, 3x3)` -> `BatchNorm` -> `Conv2D(128, 3x3)` -> `BatchNorm` -> `MaxPool(2x2)` -> `Dropout(0.3)`.
- **Conv Block 4 (Grad-CAM Target):** `Conv2D(256, 3x3)` -> `BatchNorm` -> `MaxPool(2x2)` -> `Dropout(0.35)`.
- **Classification Head:** `GlobalAveragePooling2D()` -> `Dense(256, ReLU, L2=1e-4)` -> `BatchNorm` -> `Dropout(0.4)` -> `Dense(29, Softmax)`.

### 2.2 Model B: MobileNetV2 Transfer Learning
- Pre-trained base with inverted residual bottlenecks and depthwise separable convolutions.
- Input normalization scaled to `[-1.0, 1.0]`.
- Top classification layers fine-tuned with Adam optimizer (`lr=1e-4`).

---

## 3. Computer Vision Preprocessing: MediaPipe Hand Detector
- **Palm Detection Model:** Employs single-shot BlazePalm detector optimized for mobile GPUs/CPUs.
- **Hand Landmark Model:** Predicts 21 3D hand coordinates.
- **Square Aspect ROI:** Calculates bounding box `[xmin, ymin, xmax, ymax]`, adds 25% padding on all sides, and pads to a square dimension to prevent distortion during resizing to 224×224.

---

## 4. Explainable AI (Grad-CAM)
To ensure the model is not relying on background artifacts:
1. Calculates gradients of the predicted class score $y^c$ with respect to feature activation maps $A^k$ of the final convolutional layer:
   $$\alpha_k^c = \frac{1}{Z} \sum_{i} \sum_{j} \frac{\partial y^c}{\partial A_{i, j}^k}$$
2. Computes the weighted linear combination of feature maps followed by ReLU:
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$$
3. Overlays colored JET colormap heatmap onto the hand input.

---

## 5. Security & Reliability
- Request size clamped to 16MB via Flask configuration.
- Base64 payload validation with safe OpenCV `imdecode`.
- Graceful error states if camera permissions are rejected or model weights are missing.
