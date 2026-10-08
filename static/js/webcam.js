/**
 * SignSpeak AI — Real-Time Webcam Stream & Inference Controller
 */

class WebcamController {
    constructor() {
        this.video = document.getElementById('webcam-video');
        this.canvas = document.getElementById('webcam-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        
        // Control buttons
        this.startBtn = document.getElementById('start-cam-btn');
        this.stopBtn = document.getElementById('stop-cam-btn');
        this.cameraPlaceholder = document.getElementById('camera-placeholder');
        this.laserScanner = document.getElementById('laser-scanner');

        // Output UI elements
        this.signDisplay = document.getElementById('live-sign-display');
        this.confDisplay = document.getElementById('live-conf-display');
        this.confProgressBar = document.getElementById('live-conf-bar');
        this.statusBadge = document.getElementById('live-status-badge');
        this.top3Container = document.getElementById('live-top3-container');
        this.latencyDisplay = document.getElementById('live-latency-display');
        this.fpsDisplay = document.getElementById('live-fps-display');

        // State
        this.stream = null;
        this.isRunning = false;
        this.isProcessing = false;
        this.intervalId = null;
        this.lastFrameTime = performance.now();
        this.fps = 0;

        // Stability detection for Text Builder auto-add
        this.currentStableSign = null;
        this.stableSignCount = 0;
        this.STABLE_THRESHOLD = 4; // 4 consecutive high-confidence frames to trigger letter add

        this.initEventListeners();
    }

    initEventListeners() {
        if (this.startBtn) this.startBtn.addEventListener('click', () => this.startCamera());
        if (this.stopBtn) this.stopBtn.addEventListener('click', () => this.stopCamera());
    }

    async startCamera() {
        try {
            showToast('Requesting camera permission...', 'info');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false
            });

            this.video.srcObject = this.stream;
            await this.video.play();

            this.isRunning = true;
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-flex';
            if (this.cameraPlaceholder) this.cameraPlaceholder.style.display = 'none';
            if (this.laserScanner) this.laserScanner.parentElement.classList.add('scanning');

            showToast('Camera active. Analyzing gestures in real time.', 'success');

            // Begin inference polling loop (every 220ms for smooth non-blocking execution)
            this.intervalId = setInterval(() => this.processFrame(), 220);

        } catch (err) {
            console.error('Camera error:', err);
            showToast('Camera permission denied or camera unavailable.', 'error');
        }
    }

    stopCamera() {
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.isRunning = false;
        this.startBtn.style.display = 'inline-flex';
        this.stopBtn.style.display = 'none';
        if (this.cameraPlaceholder) this.cameraPlaceholder.style.display = 'flex';
        if (this.laserScanner) this.laserScanner.parentElement.classList.remove('scanning');

        // Reset UI displays
        if (this.signDisplay) this.signDisplay.textContent = '—';
        if (this.confDisplay) this.confDisplay.textContent = '0.0%';
        if (this.confProgressBar) this.confProgressBar.style.width = '0%';
        if (this.statusBadge) {
            this.statusBadge.className = 'badge-status';
            this.statusBadge.innerHTML = '<span class="status-dot"></span> Camera Idle';
        }

        showToast('Camera stopped.', 'info');
    }

    async processFrame() {
        if (!this.isRunning || this.isProcessing || !this.video.videoWidth) return;

        this.isProcessing = true;
        const now = performance.now();
        this.fps = Math.round(1000 / (now - this.lastFrameTime));
        this.lastFrameTime = now;
        if (this.fpsDisplay) this.fpsDisplay.textContent = `${this.fps} FPS`;

        // Capture frame to offscreen canvas
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 320;
        offCanvas.height = 240;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(this.video, 0, 0, offCanvas.width, offCanvas.height);

        const base64Data = offCanvas.toDataURL('image/jpeg', 0.7);

        try {
            const thresholdInput = document.getElementById('confidence-threshold-slider');
            const threshold = thresholdInput ? parseFloat(thresholdInput.value) / 100 : 0.70;

            const res = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64Data,
                    threshold: threshold,
                    use_hand_detector: true,
                    save_to_db: true
                })
            });

            const data = await res.json();
            if (data.success) {
                this.updateUI(data);
            }
        } catch (e) {
            console.error('Frame inference error:', e);
        } finally {
            this.isProcessing = false;
        }
    }

    updateUI(data) {
        if (this.latencyDisplay) this.latencyDisplay.textContent = `${data.latency_ms} ms`;

        const sign = data.prediction;
        const conf = data.confidence;
        const isRecognized = data.status === 'recognized';

        // Update sign with subtle pop animation
        if (this.signDisplay && this.signDisplay.textContent !== sign) {
            this.signDisplay.textContent = sign;
            this.signDisplay.style.transform = 'scale(1.15)';
            setTimeout(() => { if (this.signDisplay) this.signDisplay.style.transform = 'scale(1)'; }, 150);
        }

        // Update confidence text & bar
        if (this.confDisplay) this.confDisplay.textContent = `${conf.toFixed(1)}%`;
        if (this.confProgressBar) {
            this.confProgressBar.style.width = `${Math.min(conf, 100)}%`;
            this.confProgressBar.className = `progress-fill ${conf >= 85 ? 'high' : conf >= 70 ? 'medium' : 'low'}`;
        }

        // Update status badge
        if (this.statusBadge) {
            this.statusBadge.className = `badge-status ${data.status}`;
            this.statusBadge.innerHTML = `<span class="status-dot"></span> ${data.status_message}`;
        }

        // Top 3 alternative classes
        if (this.top3Container && data.top_k) {
            this.top3Container.innerHTML = data.top_k.slice(0, 3).map(k => `
                <div class="top-k-item">
                    <span class="top-k-badge">${k.sign}</span>
                    <span class="mono-text" style="color: var(--text-secondary);">${k.confidence.toFixed(1)}%</span>
                </div>
            `).join('');
        }

        // Auto-accumulate for Text Builder if gesture is held stably
        if (window.textBuilder && isRecognized && sign !== 'nothing') {
            if (this.currentStableSign === sign) {
                this.stableSignCount++;
                if (this.stableSignCount === this.STABLE_THRESHOLD) {
                    window.textBuilder.appendChar(sign);
                    showToast(`Appended letter: ${sign}`, 'info', 1500);
                }
            } else {
                this.currentStableSign = sign;
                this.stableSignCount = 1;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('webcam-video')) {
        window.webcamController = new WebcamController();
    }
});
