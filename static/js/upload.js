/**
 * SignSpeak AI — Image Upload & Explainable AI Visualizer
 */

class UploadController {
    constructor() {
        this.dropzone = document.getElementById('upload-dropzone');
        this.fileInput = document.getElementById('image-file-input');
        this.previewSection = document.getElementById('preview-section');
        this.previewImage = document.getElementById('preview-image');
        this.submitBtn = document.getElementById('btn-analyze-image');

        // Analysis state
        this.loadingOverlay = document.getElementById('analysis-loading-overlay');
        this.resultsSection = document.getElementById('results-section');
        this.thresholdSlider = document.getElementById('upload-threshold-slider');
        this.thresholdValueText = document.getElementById('upload-threshold-val');
        this.handDetectorCheck = document.getElementById('use-hand-detector-check');
        this.gradcamCheck = document.getElementById('use-gradcam-check');

        // Result displays
        this.predLetter = document.getElementById('upload-pred-letter');
        this.predConf = document.getElementById('upload-pred-conf');
        this.predStatus = document.getElementById('upload-pred-status');
        this.predBar = document.getElementById('upload-conf-bar');
        this.topKList = document.getElementById('upload-topk-list');
        this.gradcamContainer = document.getElementById('gradcam-result-container');
        this.gradcamImage = document.getElementById('gradcam-preview-image');

        this.selectedFile = null;

        this.initEventListeners();
    }

    initEventListeners() {
        if (!this.dropzone) return;

        // Click to browse
        this.dropzone.addEventListener('click', () => this.fileInput.click());

        // File selected via input
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Drag & drop events
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropzone.classList.remove('dragover');
            }, false);
        });

        this.dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt.files && dt.files[0]) {
                this.handleFile(dt.files[0]);
            }
        });

        // Slider value update
        if (this.thresholdSlider && this.thresholdValueText) {
            this.thresholdSlider.addEventListener('input', (e) => {
                this.thresholdValueText.textContent = `${e.target.value}%`;
            });
        }

        // Analyze button
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', () => this.analyzeImage());
        }
    }

    handleFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast('Please upload a valid JPG, JPEG, or PNG image', 'error');
            return;
        }

        if (file.size > 16 * 1024 * 1024) {
            showToast('File size must be under 16 MB', 'error');
            return;
        }

        this.selectedFile = file;

        // Render preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.previewSection.style.display = 'block';
            this.submitBtn.removeAttribute('disabled');
            showToast('Image loaded. Ready for inference.', 'info', 2000);
        };
        reader.readAsDataURL(file);
    }

    async analyzeImage() {
        if (!this.selectedFile) {
            showToast('Please choose an image first', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', this.selectedFile);

        const threshold = this.thresholdSlider ? parseFloat(this.thresholdSlider.value) / 100 : 0.70;
        const useHand = this.handDetectorCheck ? this.handDetectorCheck.checked : true;
        const useGradcam = this.gradcamCheck ? this.gradcamCheck.checked : true;

        formData.append('threshold', threshold);
        formData.append('use_hand_detector', useHand);
        formData.append('gradcam', useGradcam);

        // Show AI Analysis animation overlay
        this.loadingOverlay.style.display = 'flex';
        this.submitBtn.setAttribute('disabled', 'true');

        try {
            const res = await fetch('/api/predict/image', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                this.displayResults(data);
                showToast(`Predicted Sign: ${data.prediction} (${data.confidence.toFixed(1)}%)`, 'success');
            } else {
                showToast(data.error || 'Prediction failed', 'error');
            }
        } catch (e) {
            console.error('Upload error:', e);
            showToast('Network error during prediction request', 'error');
        } finally {
            this.loadingOverlay.style.display = 'none';
            this.submitBtn.removeAttribute('disabled');
        }
    }

    displayResults(data) {
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });

        // Sign & Confidence
        this.predLetter.textContent = data.prediction;
        this.predConf.textContent = `${data.confidence.toFixed(1)}%`;

        // Progress bar
        this.predBar.style.width = `${Math.min(data.confidence, 100)}%`;
        this.predBar.className = `progress-fill ${data.confidence >= 85 ? 'high' : data.confidence >= 70 ? 'medium' : 'low'}`;

        // Status badge
        this.predStatus.className = `badge-status ${data.status}`;
        this.predStatus.innerHTML = `<span class="status-dot"></span> ${data.status_message}`;

        // Top 5 breakdown
        if (data.top_k && this.topKList) {
            this.topKList.innerHTML = data.top_k.map(k => `
                <div class="top-k-item">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <span class="top-k-badge">${k.sign}</span>
                        <div class="progress-bar-container" style="width:120px; margin:0;">
                            <div class="progress-fill" style="width:${k.confidence}%;"></div>
                        </div>
                    </div>
                    <span class="mono-text" style="color:var(--text-secondary); font-size:0.85rem;">${k.confidence.toFixed(2)}%</span>
                </div>
            `).join('');
        }

        // Grad-CAM XAI Heatmap visualization
        if (data.gradcam_image && this.gradcamContainer && this.gradcamImage) {
            this.gradcamImage.src = data.gradcam_image;
            this.gradcamContainer.style.display = 'block';
        } else if (this.gradcamContainer) {
            this.gradcamContainer.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('upload-dropzone')) {
        window.uploadController = new UploadController();
    }
});
