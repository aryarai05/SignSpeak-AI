import cv2
import numpy as np
import tensorflow as tf
import base64

class GradCAM:
    """
    Explainable AI (XAI) using Gradient-weighted Class Activation Mapping (Grad-CAM).
    Visualizes the discriminative regions of an image that activated the CNN's prediction.
    """
    def __init__(self, model, target_layer_name=None):
        self.model = model
        self.target_layer_name = target_layer_name or self._find_target_conv_layer()

    def _find_target_conv_layer(self):
        """Finds the last Conv2D layer name automatically in the architecture."""
        for layer in reversed(self.model.layers):
            if isinstance(layer, tf.keras.layers.Conv2D):
                return layer.name
            # If MobileNetV2 base model is used
            if hasattr(layer, "layers"):
                for sublayer in reversed(layer.layers):
                    if isinstance(sublayer, tf.keras.layers.Conv2D):
                        return sublayer.name
        # Default fallback
        return "target_conv"

    def generate_heatmap(self, img_array, class_index=None, eps=1e-8):
        """
        Computes the Grad-CAM heatmap for a given input batch (1, H, W, C).
        """
        try:
            target_layer = self.model.get_layer(self.target_layer_name)
        except Exception:
            # Search sublayers if nested
            target_layer = None
            for layer in self.model.layers:
                if hasattr(layer, "get_layer"):
                    try:
                        target_layer = layer.get_layer(self.target_layer_name)
                        break
                    except Exception:
                        pass
        
        if target_layer is None:
            # Fallback if no specific conv layer found
            return np.zeros((img_array.shape[1], img_array.shape[2]), dtype=np.float32)

        grad_model = tf.keras.models.Model(
            inputs=[self.model.inputs],
            outputs=[target_layer.output, self.model.output]
        )

        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array)
            if class_index is None:
                class_index = tf.argmax(predictions[0])
            loss = predictions[:, class_index]

        # Gradients of target class loss with respect to conv layer output
        grads = tape.gradient(loss, conv_outputs)
        # Guided pooling
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)

        # Apply ReLU to keep only positive contributions
        heatmap = tf.maximum(heatmap, 0.0) / (tf.math.reduce_max(heatmap) + eps)
        return heatmap.numpy()

    def overlay_heatmap(self, original_bgr: np.ndarray, heatmap: np.ndarray, alpha=0.45, colormap=cv2.COLORMAP_JET):
        """
        Overlays the computed heatmap onto the original BGR image.
        
        Returns:
            blended: BGR numpy image with heatmap superimposed
            base64_str: Base64 data URI string for frontend display
        """
        h, w = original_bgr.shape[:2]
        heatmap_resized = cv2.resize(heatmap, (w, h))

        # Rescale heatmap to 0-255 uint8
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        color_heatmap = cv2.applyColorMap(heatmap_uint8, colormap)

        # Alpha blending
        blended = cv2.addWeighted(color_heatmap, alpha, original_bgr, 1 - alpha, 0)

        # Convert to base64
        _, buffer = cv2.imencode('.jpg', blended)
        b64_str = base64.b64encode(buffer).decode('utf-8')
        data_uri = f"data:image/jpeg;base64,{b64_str}"

        return blended, data_uri
