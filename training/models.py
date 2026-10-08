import tensorflow as tf
from tensorflow.keras import layers, models, regularizers

def build_custom_cnn(input_shape=(224, 224, 3), num_classes=29, learning_rate=1e-4):
    """
    Builds a robust Deep Convolutional Neural Network (CNN) tailored for ASL sign recognition.
    
    Architecture:
    - 4 Convolutional blocks with increasing filters (32 -> 64 -> 128 -> 256)
    - Batch Normalization after each convolution for stable gradients
    - MaxPooling2D for spatial downsampling
    - Dropout for regularization and preventing overfitting
    - Dense head with L2 regularization
    - Softmax classification layer
    """
    inputs = layers.Input(shape=input_shape, name="input_image")

    # Block 1
    x = layers.Conv2D(32, (3, 3), padding="same", activation="relu", name="conv1")(inputs)
    x = layers.BatchNormalization(name="bn1")(x)
    x = layers.Conv2D(32, (3, 3), padding="same", activation="relu", name="conv1_2")(x)
    x = layers.BatchNormalization(name="bn1_2")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool1")(x)
    x = layers.Dropout(0.2, name="drop1")(x)

    # Block 2
    x = layers.Conv2D(64, (3, 3), padding="same", activation="relu", name="conv2")(x)
    x = layers.BatchNormalization(name="bn2")(x)
    x = layers.Conv2D(64, (3, 3), padding="same", activation="relu", name="conv2_2")(x)
    x = layers.BatchNormalization(name="bn2_2")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool2")(x)
    x = layers.Dropout(0.25, name="drop2")(x)

    # Block 3
    x = layers.Conv2D(128, (3, 3), padding="same", activation="relu", name="conv3")(x)
    x = layers.BatchNormalization(name="bn3")(x)
    x = layers.Conv2D(128, (3, 3), padding="same", activation="relu", name="conv3_2")(x)
    x = layers.BatchNormalization(name="bn3_2")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool3")(x)
    x = layers.Dropout(0.3, name="drop3")(x)

    # Block 4 - Target conv layer for Grad-CAM
    x = layers.Conv2D(256, (3, 3), padding="same", activation="relu", name="target_conv")(x)
    x = layers.BatchNormalization(name="bn4")(x)
    x = layers.MaxPooling2D(pool_size=(2, 2), name="pool4")(x)
    x = layers.Dropout(0.35, name="drop4")(x)

    # Classification Head
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dense(256, activation="relu", kernel_regularizer=regularizers.l2(1e-4), name="dense_features")(x)
    x = layers.BatchNormalization(name="bn_dense")(x)
    x = layers.Dropout(0.4, name="drop_dense")(x)

    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name="SignSpeak_CustomCNN")
    
    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="categorical_crossentropy",
        metrics=["accuracy", tf.keras.metrics.Precision(name="precision"), tf.keras.metrics.Recall(name="recall")]
    )
    return model

def build_mobilenetv2(input_shape=(224, 224, 3), num_classes=29, learning_rate=1e-4, fine_tune_layers=30):
    """
    Builds a Transfer Learning model utilizing MobileNetV2 pretrained on ImageNet.
    Ideal for real-time mobile/edge latency with high generalization capability.
    """
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet"
    )

    # Freeze base model layers except the top fine_tune_layers
    if fine_tune_layers > 0:
        base_model.trainable = True
        for layer in base_model.layers[:-fine_tune_layers]:
            layer.trainable = False
    else:
        base_model.trainable = False

    inputs = layers.Input(shape=input_shape, name="input_image")
    # Preprocess inputs using MobileNetV2 standard [-1, 1] normalization
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base_model(x, training=False)
    
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.BatchNormalization(name="bn_head")(x)
    x = layers.Dense(256, activation="relu", name="fc_head")(x)
    x = layers.Dropout(0.4, name="drop_head")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name="SignSpeak_MobileNetV2")

    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="categorical_crossentropy",
        metrics=["accuracy", tf.keras.metrics.Precision(name="precision"), tf.keras.metrics.Recall(name="recall")]
    )
    return model
