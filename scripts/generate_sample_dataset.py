import os
import sys
import math
import random
import cv2
import numpy as np
from pathlib import Path

# Add project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import Config

# Hand gesture structural signatures for ASL classes
# Represented as: (palm_shape, thumb_state, index_state, middle_state, ring_state, pinky_state)
# states: 0 = folded/fist, 1 = extended, 0.5 = hooked/half-curled
GESTURE_SPECS = {
    'A': (0.8, 1, 0, 0, 0, 0),        # Fist, thumb beside index pointing up
    'B': (0.8, 0, 1, 1, 1, 1),        # 4 fingers up, thumb folded across palm
    'C': (0.6, 0.5, 0.5, 0.5, 0.5, 0.5), # Curved C-shape
    'D': (0.7, 0.5, 1, 0, 0, 0),      # Index up, thumb touching middle/ring/pinky
    'E': (0.7, 0, 0.4, 0.4, 0.4, 0.4),# All fingers curled down to thumb
    'F': (0.7, 0.5, 0.5, 1, 1, 1),    # Index touches thumb (circle), 3 fingers up
    'G': (0.7, 1, 1, 0, 0, 0),        # Thumb and index pointing horizontal
    'H': (0.7, 0, 1, 1, 0, 0),        # Index and middle extended horizontal
    'I': (0.7, 0, 0, 0, 0, 1),        # Pinky up, others folded
    'J': (0.7, 0, 0, 0, 0, 1),        # Pinky up with curve motion
    'K': (0.7, 0.8, 1, 1, 0, 0),      # V-sign with thumb between index and middle
    'L': (0.8, 1, 1, 0, 0, 0),        # L-shape: thumb and index at 90 deg
    'M': (0.7, 0, 0.2, 0.2, 0.2, 0),  # 3 fingers over thumb
    'N': (0.7, 0, 0.2, 0.2, 0, 0),    # 2 fingers over thumb
    'O': (0.6, 0.5, 0.5, 0.5, 0.5, 0.5), # O-shape
    'P': (0.7, 0.8, 1, 0.8, 0, 0),    # K pointing downwards
    'Q': (0.7, 0.8, 0.8, 0, 0, 0),    # G pointing downwards
    'R': (0.7, 0, 1, 1, 0, 0),        # Crossed index and middle fingers
    'S': (0.8, 0.8, 0, 0, 0, 0),      # Tight fist, thumb across all fingers
    'T': (0.7, 0.6, 0.2, 0, 0, 0),    # Thumb between index and middle
    'U': (0.7, 0, 1, 1, 0, 0),        # Index and middle together pointing up
    'V': (0.7, 0, 1, 1, 0, 0),        # Peace / V-sign (spread)
    'W': (0.7, 0, 1, 1, 1, 0),        # 3 fingers spread up
    'X': (0.7, 0, 0.5, 0, 0, 0),      # Index finger hooked
    'Y': (0.7, 1, 0, 0, 0, 1),        # 'Hang loose' — thumb and pinky extended
    'Z': (0.7, 0, 1, 0, 0, 0),        # Index finger drawing Z in air
    'del': (0.5, 0.3, 0.3, 0.3, 0.3, 0.3), # Flat open hand moving back
    'nothing': (0.0, 0, 0, 0, 0, 0),  # Background only / no hand
    'space': (0.8, 0.8, 0.8, 0.8, 0.8, 0.8) # Open flat palm facing horizontal
}

def draw_synthetic_hand_sign(sign_char: str, size=224):
    """
    Renders an anatomically inspired hand gesture image with realistic skin tones,
    shadows, lighting, and geometric variations for the given ASL character.
    """
    img = np.zeros((size, size, 3), dtype=np.uint8)

    # Random background: light subtle indoor gradient
    bg_tone = random.randint(210, 245)
    img[:] = (bg_tone, bg_tone - random.randint(5, 15), bg_tone - random.randint(10, 25))

    # Add subtle background texture / noise
    noise = np.random.normal(0, 5, (size, size, 3)).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    spec = GESTURE_SPECS.get(sign_char, (0.7, 0, 0, 0, 0, 0))
    palm_scale, thumb, index_f, middle_f, ring_f, pinky_f = spec

    if sign_char == 'nothing':
        return img  # Empty background

    # Skin color variations (melanin spectrum in BGR)
    skin_types = [
        (165, 195, 235),  # Fair
        (140, 175, 220),  # Light-medium
        (110, 150, 195),  # Olive
        (80, 120, 170),   # Medium brown
        (60, 95, 145)     # Deep brown
    ]
    skin_base = random.choice(skin_types)
    skin_color = tuple(int(c + random.randint(-10, 10)) for c in skin_base)
    skin_shadow = tuple(int(c * 0.75) for c in skin_color)
    skin_highlight = tuple(min(255, int(c * 1.15)) for c in skin_color)

    # Center coords with small random translation and scale
    cx = size // 2 + random.randint(-8, 8)
    cy = size // 2 + random.randint(10, 25)
    scale = random.uniform(0.92, 1.08)

    # 1. Wrist & Forearm
    wrist_w = int(32 * scale)
    wrist_h = int(60 * scale)
    cv2.rectangle(img, (cx - wrist_w, cy + int(45 * scale)), (cx + wrist_w, cy + int(45 * scale) + wrist_h), skin_shadow, -1)
    cv2.rectangle(img, (cx - wrist_w + 3, cy + int(45 * scale)), (cx + wrist_w - 3, cy + int(45 * scale) + wrist_h), skin_color, -1)

    # 2. Palm Ellipse
    palm_rx = int(38 * scale * palm_scale)
    palm_ry = int(45 * scale)
    cv2.ellipse(img, (cx, cy), (palm_rx, palm_ry), 0, 0, 360, skin_shadow, -1)
    cv2.ellipse(img, (cx, cy), (palm_rx - 2, palm_ry - 2), 0, 0, 360, skin_color, -1)
    # Palm highlight
    cv2.ellipse(img, (cx - 4, cy - 6), (int(palm_rx * 0.6), int(palm_ry * 0.6)), 0, 0, 360, skin_highlight, -1)

    # 3. Fingers: (index, middle, ring, pinky)
    finger_configs = [
        # (extension_factor, base_offset_x, base_offset_y, max_length, spread_angle)
        (index_f, -22, -28, 54, -6),
        (middle_f, -7, -35, 60, 0),
        (ring_f, 9, -32, 53, 5),
        (pinky_f, 24, -24, 44, 11)
    ]

    # Render fingers
    for ext, ox, oy, max_len, angle_deg in finger_configs:
        fx = cx + int(ox * scale)
        fy = cy + int(oy * scale)
        f_len = int(max_len * ext * scale)
        f_radius = int(8 * scale)

        if ext > 0.1:
            rad = math.radians(angle_deg + random.randint(-3, 3))
            tip_x = fx + int(f_len * math.sin(rad))
            tip_y = fy - int(f_len * math.cos(rad))

            # Outer stroke/shadow
            cv2.line(img, (fx, fy), (tip_x, tip_y), skin_shadow, f_radius * 2 + 3)
            # Inner skin
            cv2.line(img, (fx, fy), (tip_x, tip_y), skin_color, f_radius * 2)
            # Tip joint
            cv2.circle(img, (tip_x, tip_y), f_radius, skin_color, -1)
            cv2.circle(img, (tip_x - 1, tip_y - 2), int(f_radius * 0.6), skin_highlight, -1)
        else:
            # Curled finger knuckle
            cv2.circle(img, (fx, fy), f_radius + 2, skin_shadow, -1)
            cv2.circle(img, (fx, fy), f_radius, skin_color, -1)

    # 4. Thumb
    tx = cx - int(34 * scale)
    ty = cy + int(8 * scale)
    t_radius = int(9 * scale)
    t_len = int(45 * thumb * scale)
    if thumb > 0.2:
        t_angle = math.radians(-42 + (1 - thumb) * 20 + random.randint(-4, 4))
        tip_tx = tx + int(t_len * math.sin(t_angle))
        tip_ty = ty - int(t_len * math.cos(t_angle))
        cv2.line(img, (tx, ty), (tip_tx, tip_ty), skin_shadow, t_radius * 2 + 2)
        cv2.line(img, (tx, ty), (tip_tx, tip_ty), skin_color, t_radius * 2)
        cv2.circle(img, (tip_tx, tip_ty), t_radius, skin_color, -1)
    else:
        # Thumb tucked across palm
        cv2.circle(img, (cx - 15, cy + 5), t_radius + 2, skin_shadow, -1)
        cv2.circle(img, (cx - 15, cy + 5), t_radius, skin_color, -1)

    # Apply slight blur for realistic camera soft focus
    img = cv2.GaussianBlur(img, (3, 3), 0.5)
    return img

def create_sample_dataset():
    """Generates train, validation, and test sets for all 29 ASL classes."""
    print("=" * 65)
    print("   SignSpeak AI - Generating Synthetic Baseline ASL Dataset")
    print("=" * 65)

    splits = {
        "train": 35,       # 35 images per class = 1,015 training images
        "validation": 8,   # 8 images per class = 232 validation images
        "test": 6          # 6 images per class = 174 test images
    }

    total_generated = 0
    for split, count_per_class in splits.items():
        split_dir = Config.DATASET_DIR / split
        split_dir.mkdir(parents=True, exist_ok=True)
        print(f"[*] Generating {split.upper()} set ({count_per_class} samples/class)...")

        for class_name in Config.CLASSES:
            class_folder = split_dir / class_name
            class_folder.mkdir(parents=True, exist_ok=True)

            for i in range(count_per_class):
                img = draw_synthetic_hand_sign(class_name)
                img_path = class_folder / f"{class_name}_{i:03d}.jpg"
                cv2.imwrite(str(img_path), img)
                total_generated += 1

    print(f"[+] Successfully generated {total_generated} images across {len(Config.CLASSES)} classes!")
    print(f"[+] Location: {Config.DATASET_DIR}")

if __name__ == "__main__":
    create_sample_dataset()
