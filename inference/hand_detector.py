import cv2
import numpy as np
import mediapipe as mp
from config import Config

class HandDetector:
    """
    Real-time Hand Detection and Landmark Extraction powered by MediaPipe Hands.
    Extracts Region of Interest (ROI) bounding boxes with padding for CNN input.
    """
    def __init__(
        self,
        max_num_hands: int = Config.MP_MAX_NUM_HANDS,
        min_detection_confidence: float = Config.MP_MIN_DETECTION_CONFIDENCE,
        min_tracking_confidence: float = Config.MP_MIN_TRACKING_CONFIDENCE,
        padding: float = Config.HAND_BBOX_PADDING
    ):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_num_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        self.padding = padding

    def detect(self, image: np.ndarray, draw_overlay: bool = True):
        """
        Detects hand in the input BGR image.
        
        Args:
            image: OpenCV BGR image (H, W, 3)
            draw_overlay: Whether to draw stylized landmarks on the returned annotated image
            
        Returns:
            dict containing:
                - 'hand_detected': bool
                - 'hand_crop': cropped BGR image of the hand or None
                - 'bbox': [xmin, ymin, xmax, ymax] in pixels or None
                - 'landmarks': list of normalized landmarks dicts [{'x', 'y', 'z'}]
                - 'annotated_frame': image with drawn hand landmarks & cyberpunk bounding box
        """
        if image is None or image.size == 0:
            return {
                "hand_detected": False,
                "hand_crop": None,
                "bbox": None,
                "landmarks": [],
                "annotated_frame": image
            }

        h, w, c = image.shape
        annotated_frame = image.copy() if draw_overlay else image

        # MediaPipe expects RGB
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(img_rgb)

        if not results.multi_hand_landmarks:
            # Fallback: Hand not detected by MediaPipe
            return {
                "hand_detected": False,
                "hand_crop": None,
                "bbox": None,
                "landmarks": [],
                "annotated_frame": annotated_frame
            }

        # Select primary hand (first detected)
        hand_landmarks = results.multi_hand_landmarks[0]
        landmark_list = []
        x_coords = []
        y_coords = []

        for lm in hand_landmarks.landmark:
            x_coords.append(lm.x * w)
            y_coords.append(lm.y * h)
            landmark_list.append({"x": lm.x, "y": lm.y, "z": lm.z})

        # Calculate bounding box
        xmin = int(min(x_coords))
        xmax = int(max(x_coords))
        ymin = int(min(y_coords))
        ymax = int(max(y_coords))

        box_w = xmax - xmin
        box_h = ymax - ymin

        # Add contextual padding around hand
        pad_x = int(box_w * self.padding)
        pad_y = int(box_h * self.padding)

        # Make crop square to prevent aspect-ratio distortion when resizing
        side = max(box_w + 2 * pad_x, box_h + 2 * pad_y)
        center_x = (xmin + xmax) // 2
        center_y = (ymin + ymax) // 2

        crop_xmin = max(0, center_x - side // 2)
        crop_ymin = max(0, center_y - side // 2)
        crop_xmax = min(w, center_x + side // 2)
        crop_ymax = min(h, center_y + side // 2)

        # Extract hand crop
        hand_crop = image[crop_ymin:crop_ymax, crop_xmin:crop_xmax]

        if draw_overlay:
            # Draw sleek landmarks
            self.mp_drawing.draw_landmarks(
                annotated_frame,
                hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS,
                self.mp_drawing_styles.get_default_hand_landmarks_style(),
                self.mp_drawing_styles.get_default_hand_connections_style()
            )

            # Draw glowing bounding box
            color_primary = (235, 130, 30)  # Neon Cyan/Blue in BGR
            cv2.rectangle(annotated_frame, (crop_xmin, crop_ymin), (crop_xmax, crop_ymax), color_primary, 2)
            
            # Corner brackets for modern HUD look
            corner_len = 15
            thick = 3
            # Top-left
            cv2.line(annotated_frame, (crop_xmin, crop_ymin), (crop_xmin + corner_len, crop_ymin), (0, 255, 180), thick)
            cv2.line(annotated_frame, (crop_xmin, crop_ymin), (crop_xmin, crop_ymin + corner_len), (0, 255, 180), thick)
            # Top-right
            cv2.line(annotated_frame, (crop_xmax, crop_ymin), (crop_xmax - corner_len, crop_ymin), (0, 255, 180), thick)
            cv2.line(annotated_frame, (crop_xmax, crop_ymin), (crop_xmax, crop_ymin + corner_len), (0, 255, 180), thick)
            # Bottom-left
            cv2.line(annotated_frame, (crop_xmin, crop_ymax), (crop_xmin + corner_len, crop_ymax), (0, 255, 180), thick)
            cv2.line(annotated_frame, (crop_xmin, crop_ymax), (crop_xmin, crop_ymax - corner_len), (0, 255, 180), thick)
            # Bottom-right
            cv2.line(annotated_frame, (crop_xmax, crop_ymax), (crop_xmax - corner_len, crop_ymax), (0, 255, 180), thick)
            cv2.line(annotated_frame, (crop_xmax, crop_ymax), (crop_xmax, crop_ymax - corner_len), (0, 255, 180), thick)

        return {
            "hand_detected": True,
            "hand_crop": hand_crop,
            "bbox": [crop_xmin, crop_ymin, crop_xmax, crop_ymax],
            "landmarks": landmark_list,
            "annotated_frame": annotated_frame
        }
