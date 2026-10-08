/**
 * SignSpeak AI — Main Workspace Controller
 * Unifies Camera Recognition, Sign Board, Text Builder, and Speech Synthesis.
 */

class SignSpeakWorkspace {
    constructor() {
        // Message Builder elements
        this.messageBox = document.getElementById('workspace-message-box');
        this.charCountBadge = document.getElementById('char-count-badge');
        this.btnSpace = document.getElementById('btn-space');
        this.btnDelete = document.getElementById('btn-delete');
        this.btnClear = document.getElementById('btn-clear');
        this.btnCopy = document.getElementById('btn-copy');
        this.btnSpeak = document.getElementById('btn-speak-main');
        this.speedSelect = document.getElementById('voice-speed-select');

        // Camera elements
        this.video = document.getElementById('webcam-video');
        this.canvas = document.getElementById('webcam-canvas');
        this.btnStartCam = document.getElementById('btn-start-camera');
        this.btnStopCam = document.getElementById('btn-stop-camera');
        this.camPlaceholder = document.getElementById('camera-offline-placeholder');
        this.guideBadge = document.getElementById('camera-guide-badge');
        this.guideText = document.getElementById('guide-text');
        this.guideIcon = document.getElementById('guide-icon');
        this.targetBox = document.getElementById('hand-target-box');
        this.stabilityBar = document.getElementById('stability-progress-bar');
        this.recognizedLetterElem = document.getElementById('recognized-sign-letter');
        this.recognizedConfElem = document.getElementById('recognized-sign-confidence');
        this.camStatusDot = document.getElementById('cam-status-dot');
        this.camStatusLabel = document.getElementById('cam-status-label');

        // State
        this.chars = [];
        this.isCameraRunning = false;
        this.isProcessingFrame = false;
        this.stream = null;
        this.pollInterval = null;
        this.currentMode = 'split'; // 'camera', 'board', 'split'

        // Prediction Stability Tuning
        this.lastPredictedSign = null;
        this.stableFrameCount = 0;
        this.REQUIRED_STABLE_FRAMES = 4; // ~900ms of stable gesture
        this.cooldownFrames = 0;

        this.init();
    }

    init() {
        this.initMessageControls();
        this.initCameraControls();
        this.renderSignBoard('Alphabet');
        this.renderQuickPhrases();
        this.handleUrlParams();
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        if (mode) switchWorkspaceMode(mode);
    }

    // ================= MESSAGE BUILDER =================

    initMessageControls() {
        if (this.btnSpace) this.btnSpace.addEventListener('click', () => this.appendChar(' '));
        if (this.btnDelete) this.btnDelete.addEventListener('click', () => this.deleteChar());
        if (this.btnClear) this.btnClear.addEventListener('click', () => this.clearMessage());
        if (this.btnCopy) this.btnCopy.addEventListener('click', () => this.copyMessage());
        if (this.btnSpeak) this.btnSpeak.addEventListener('click', () => this.speakMessage());

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            // Avoid capturing if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (e.key === 'Backspace') {
                e.preventDefault();
                this.deleteChar();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.appendChar(' ');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.speakMessage();
            }
        });
    }

    appendChar(char) {
        if (!char) return;
        if (char === 'del') {
            this.deleteChar();
            return;
        }
        if (char === 'space') char = ' ';
        if (char === 'nothing') return;

        // Prevent repeated space
        if (char === ' ' && this.chars[this.chars.length - 1] === ' ') return;

        this.chars.push(char);
        this.renderMessage();

        if (char === ' ' && window.signi) {
            window.signi.onWordCompleted();
        }
    }

    appendPhrase(phrase) {
        if (!phrase) return;
        if (this.chars.length > 0 && this.chars[this.chars.length - 1] !== ' ') {
            this.chars.push(' ');
        }
        for (const c of phrase) {
            this.chars.push(c);
        }
        this.renderMessage();
        showToast(`Added: "${phrase}"`, 'info', 1500);
        if (window.signi) window.signi.onWordCompleted();
    }

    deleteChar() {
        if (this.chars.length > 0) {
            this.chars.pop();
            this.renderMessage();
        }
    }

    clearMessage() {
        if (this.chars.length > 0) {
            this.chars = [];
            this.renderMessage();
            showToast('Message cleared', 'info', 1500);
            if (window.signi) {
                window.signi.setState('idle');
                window.signi.showBalloon("Ready for your next message! 🌟", 2500);
            }
        }
    }

    getMessageText() {
        return this.chars.join('').trim();
    }

    renderMessage() {
        if (!this.messageBox) return;

        const text = this.chars.join('');
        if (this.charCountBadge) {
            this.charCountBadge.textContent = `${text.length} characters`;
        }

        if (this.chars.length === 0) {
            this.messageBox.innerHTML = `
                <span id="message-empty-placeholder" style="color: var(--text-light); font-size: 1.15rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.6rem;">
                    <span style="font-size: 1.35rem;">✨</span> Nothing here yet. Show a sign to the camera or tap cards below to create your message!
                </span>
            `;
            return;
        }

        this.messageBox.innerHTML = this.chars.map(c => `
            <span class="char-chip ${c === ' ' ? 'space' : ''}">
                ${c === ' ' ? '&nbsp;' : c}
            </span>
        `).join('');
    }

    speakMessage() {
        const text = this.getMessageText();
        if (!text) {
            showToast('Please add some signs first', 'error');
            if (window.signi) window.signi.showBalloon("Add some signs first so I can speak them!", 3000);
            return;
        }

        if (!('speechSynthesis' in window)) {
            showToast('Speech synthesis is not supported on this browser', 'error');
            return;
        }

        window.speechSynthesis.cancel(); // Stop prior speech
        const utterance = new SpeechSynthesisUtterance(text);

        const speed = this.speedSelect ? parseFloat(this.speedSelect.value) : 1.0;
        utterance.rate = speed;
        utterance.pitch = 1.0;

        // Select natural voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => {
            showToast(`Speaking: "${text}"`, 'success', 2500);
            if (this.btnSpeak) {
                this.btnSpeak.classList.add('speaking');
                this.btnSpeak.innerHTML = `<i class="fas fa-volume-high fa-beat"></i> Speaking...`;
            }
            if (window.signi) window.signi.onMessageSpoken(text);
        };

        const restoreSpeakBtn = () => {
            if (this.btnSpeak) {
                this.btnSpeak.classList.remove('speaking');
                this.btnSpeak.innerHTML = `<i class="fas fa-volume-high"></i> Speak Message`;
            }
            if (window.signi) window.signi.setState('idle');
        };

        utterance.onend = restoreSpeakBtn;
        utterance.onerror = restoreSpeakBtn;

        window.speechSynthesis.speak(utterance);

        // Auto-save spoken message to SQLite for history & dashboard
        try {
            fetch('/api/messages/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, source: 'workspace' })
            }).catch(() => {});
        } catch (e) {}
    }

    copyMessage() {
        const text = this.getMessageText();
        if (!text) {
            showToast('No text to copy', 'error');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            showToast('Message copied to clipboard!', 'success');
        });
    }

    // ================= CAMERA RECOGNITION =================

    initCameraControls() {
        if (this.btnStartCam) this.btnStartCam.addEventListener('click', () => this.startCamera());
        if (this.btnStopCam) this.btnStopCam.addEventListener('click', () => this.stopCamera());
    }

    async startCamera() {
        try {
            this.setGuideStatus('info', 'Requesting camera access...', 'fa-spinner fa-spin');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false
            });

            this.video.srcObject = this.stream;
            await this.video.play();

            this.isCameraRunning = true;
            this.btnStartCam.style.display = 'none';
            this.btnStopCam.style.display = 'inline-flex';
            if (this.camPlaceholder) this.camPlaceholder.style.display = 'none';

            const feedBox = document.querySelector('.camera-feed-box');
            if (feedBox) feedBox.classList.add('camera-active');

            this.updateCameraStatusPill(true);
            this.setGuideStatus('info', 'Place your hand inside the frame', 'fa-hand');
            showToast('Camera active. SignSpeak is ready.', 'success');

            if (window.signi) window.signi.onCameraStateChanged(true);

            // Polling loop: every 220ms
            this.pollInterval = setInterval(() => this.processWebcamFrame(), 220);

        } catch (err) {
            console.error('Camera access error:', err);
            const feedBox = document.querySelector('.camera-feed-box');
            if (feedBox) feedBox.classList.remove('camera-active');
            this.updateCameraStatusPill(false);
            this.setGuideStatus('error', "Camera access isn't available. You can use the Sign Board instead.", 'fa-video-slash');
            showToast("Camera access isn't available. You can use the Sign Board instead.", 'error', 4500);
            if (window.signi) window.signi.onCameraStateChanged(false);
        }
    }

    stopCamera() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        this.isCameraRunning = false;
        this.btnStartCam.style.display = 'inline-flex';
        this.btnStopCam.style.display = 'none';
        if (this.camPlaceholder) this.camPlaceholder.style.display = 'flex';

        const feedBox = document.querySelector('.camera-feed-box');
        if (feedBox) feedBox.classList.remove('camera-active');

        this.updateCameraStatusPill(false);
        this.setGuideStatus('info', "Click 'Start Camera' below", 'fa-hand');
        if (this.recognizedLetterElem) this.recognizedLetterElem.textContent = '—';
        if (this.recognizedConfElem) this.recognizedConfElem.textContent = '0%';
        if (this.stabilityBar) this.stabilityBar.style.width = '0%';
        if (this.targetBox) this.targetBox.classList.remove('detected');

        if (window.signi) window.signi.onCameraStateChanged(false);

        showToast('Camera stopped.', 'info');
    }

    updateCameraStatusPill(online) {
        if (this.camStatusDot && this.camStatusLabel) {
            this.camStatusDot.style.background = online ? 'var(--brand-emerald)' : 'var(--text-light)';
            if (online) {
                this.camStatusDot.classList.add('pulse-active');
            } else {
                this.camStatusDot.classList.remove('pulse-active');
            }
            this.camStatusLabel.textContent = online ? 'Live & Recognizing' : 'Camera Offline';
        }
    }

    setGuideStatus(type, message, iconClass) {
        if (this.guideBadge && this.guideText) {
            this.guideText.textContent = message;
            if (this.guideIcon) this.guideIcon.className = `fas ${iconClass}`;
            this.guideBadge.className = `camera-guide-pill ${type}`;
        }
    }

    async processWebcamFrame() {
        if (!this.isCameraRunning || this.isProcessingFrame || !this.video.videoWidth) return;

        this.isProcessingFrame = true;

        if (this.cooldownFrames > 0) {
            this.cooldownFrames--;
            this.isProcessingFrame = false;
            return;
        }

        // Grab current frame into temporary canvas
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 320;
        offCanvas.height = 240;
        const ctx = offCanvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, offCanvas.width, offCanvas.height);

        const base64Data = offCanvas.toDataURL('image/jpeg', 0.7);

        try {
            const res = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64Data,
                    threshold: 0.65,
                    use_hand_detector: true,
                    save_to_db: false
                })
            });

            const data = await res.json();
            if (data.success) {
                this.handleInferenceResult(data);
            }
        } catch (e) {
            console.error('Frame inference error:', e);
        } finally {
            this.isProcessingFrame = false;
        }
    }

    handleInferenceResult(data) {
        const hasHand = data.hand_detected;
        const sign = data.prediction;
        const conf = data.confidence;
        const isRecognized = data.status === 'recognized';

        // 1. Hand Detection Feedback
        if (this.targetBox) {
            if (hasHand) this.targetBox.classList.add('detected');
            else this.targetBox.classList.remove('detected');
        }

        if (!hasHand) {
            this.setGuideStatus('info', 'Place your hand inside the frame', 'fa-hand');
            if (this.stabilityBar) this.stabilityBar.style.width = '0%';
            this.stableFrameCount = 0;
            this.lastPredictedSign = null;
            if (window.signi) window.signi.onHandDetected(false);
            return;
        }

        if (window.signi) window.signi.onHandDetected(true);

        // 2. Hand in view
        if (!isRecognized || sign === 'nothing') {
            this.setGuideStatus('info', 'Hand detected — hold your sign steady', 'fa-hand-paper');
            if (this.stabilityBar) this.stabilityBar.style.width = '0%';
            this.stableFrameCount = 0;
            this.lastPredictedSign = null;
            return;
        }

        // 3. Stable Sign Logic
        if (this.recognizedLetterElem && this.recognizedLetterElem.textContent !== sign) {
            this.recognizedLetterElem.textContent = sign;
            this.recognizedLetterElem.classList.remove('pop-in');
            void this.recognizedLetterElem.offsetWidth;
            this.recognizedLetterElem.classList.add('pop-in');
        }
        if (this.recognizedConfElem) this.recognizedConfElem.textContent = `${conf.toFixed(0)}%`;

        if (this.lastPredictedSign === sign) {
            this.stableFrameCount++;
            const pct = Math.min((this.stableFrameCount / this.REQUIRED_STABLE_FRAMES) * 100, 100);
            if (this.stabilityBar) this.stabilityBar.style.width = `${pct}%`;

            this.setGuideStatus('info', `Hold steady for: ${sign}`, 'fa-clock');

            // Stable gesture threshold reached!
            if (this.stableFrameCount >= this.REQUIRED_STABLE_FRAMES) {
                this.appendChar(sign);
                this.setGuideStatus('recognized', `✓ ${sign} recognized!`, 'fa-check');
                showToast(`Recognized letter: ${sign}`, 'success', 1800);

                if (window.signi) window.signi.onSignRecognized(sign);

                // Reset and apply a brief 4-frame cooldown to prevent repeated AAAAA
                this.stableFrameCount = 0;
                this.cooldownFrames = 5;
                if (this.stabilityBar) this.stabilityBar.style.width = '0%';
            }
        } else {
            this.lastPredictedSign = sign;
            this.stableFrameCount = 1;
            if (this.stabilityBar) this.stabilityBar.style.width = '20%';
        }
    }

    // ================= SIGN BOARD =================

    renderSignBoard(category = 'Alphabet') {
        const boardContainer = document.getElementById('signboard-grid');
        if (!boardContainer || typeof SIGN_DATABASE === 'undefined') return;

        let filtered = SIGN_DATABASE;
        if (category !== 'All') {
            filtered = SIGN_DATABASE.filter(s => s.category === category);
        }

        boardContainer.innerHTML = filtered.map(item => `
            <div class="sign-card" onclick="window.workspace.appendSignItem('${item.id}', '${item.type}', this)">
                <div class="sign-svg-wrapper">
                    ${generateHandSignSvg(item.id)}
                </div>
                <div class="sign-letter-title">${item.label}</div>
                <div class="sign-sub-meaning">${item.name}</div>
                <button class="btn-add-sign" type="button"><i class="fas fa-plus"></i> Add</button>
            </div>
        `).join('');
    }

    appendSignItem(id, type, cardElem = null) {
        const item = SIGN_DATABASE.find(s => s.id === id);
        if (!item) return;

        // Visual click feedback on the card
        if (cardElem) {
            cardElem.classList.add('just-added');
            const addBtn = cardElem.querySelector('.btn-add-sign');
            if (addBtn) {
                const oldHtml = addBtn.innerHTML;
                addBtn.innerHTML = '<i class="fas fa-check"></i> Added';
                setTimeout(() => { addBtn.innerHTML = oldHtml; }, 600);
            }
            setTimeout(() => cardElem.classList.remove('just-added'), 450);
        }

        if (type === 'alphabet') {
            this.appendChar(item.label);
        } else {
            this.appendPhrase(item.label);
        }
    }

    // ================= QUICK PHRASES =================

    renderQuickPhrases() {
        const container = document.getElementById('quick-phrases-container');
        if (!container || typeof QUICK_PHRASES === 'undefined') return;

        container.innerHTML = QUICK_PHRASES.map(p => `
            <button type="button" class="phrase-chip ${p.isEmergency ? 'emergency' : ''}" onclick="window.workspace.appendPhrase('${p.text}')">
                <i class="fas ${p.icon}"></i> ${p.text}
            </button>
        `).join('');
    }
}

// Global Category Filter
function filterBoardCategory(cat, btn) {
    if (window.workspace) {
        window.workspace.renderSignBoard(cat);
        const parent = btn.parentElement;
        if (parent) {
            parent.querySelectorAll('button').forEach(b => {
                b.className = 'btn btn-sm btn-secondary';
            });
            btn.className = 'btn btn-sm btn-primary';
        }
    }
}

// Global Mode Switcher
function switchWorkspaceMode(mode) {
    const camCol = document.getElementById('camera-section');
    const boardCol = document.getElementById('signboard-section');
    const grid = document.getElementById('workspace-grid');
    if (!grid || !camCol || !boardCol) return;

    // Update tab buttons
    document.querySelectorAll('.segmented-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    const activeTab = document.getElementById(`tab-mode-${mode}`);
    if (activeTab) activeTab.classList.add('active');

    if (mode === 'camera') {
        grid.style.gridTemplateColumns = '1fr';
        camCol.style.display = 'block';
        boardCol.style.display = 'none';
    } else if (mode === 'board') {
        grid.style.gridTemplateColumns = '1fr';
        camCol.style.display = 'none';
        boardCol.style.display = 'block';
    } else {
        // Split
        grid.style.gridTemplateColumns = '1.25fr 1fr';
        camCol.style.display = 'block';
        boardCol.style.display = 'block';
    }
}

// Emergency Assistance Action
function handleEmergencyHelp() {
    if (window.workspace) {
        window.workspace.clearMessage();
        window.workspace.appendPhrase('I NEED HELP');
        window.workspace.speakMessage();
        showToast('Emergency phrase activated and spoken!', 'error', 3500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('workspace-message-box')) {
        window.workspace = new SignSpeakWorkspace();
    }
});
