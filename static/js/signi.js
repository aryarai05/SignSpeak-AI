/**
 * SignSpeak AI — Signi Companion & Fun Mode Engine
 * "Turn Sign Language Into Voice"
 * Lovable, Multi-State Interactive AI Companion, Assistant & Play System.
 */

// =============================================================================
// 1. Web Audio Procedural Dance Synthesizer (Zero External Dependencies)
// =============================================================================

class SigniDanceSynthesizer {
    constructor() {
        this.audioCtx = null;
        this.isPlaying = false;
        this.tempo = 120; // BPM
        this.timerId = null;
        this.step = 0;

        // Upbeat pop progression chords: C - G - Am - F
        this.progression = [
            [261.63, 329.63, 392.00, 523.25], // C Major
            [196.00, 246.94, 293.66, 392.00], // G Major
            [220.00, 261.63, 329.63, 440.00], // A Minor
            [174.61, 220.00, 261.63, 349.23]  // F Major
        ];
    }

    init() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
    }

    start() {
        this.init();
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.step = 0;
        this.tick();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    setTempo(bpm) {
        this.tempo = Math.max(70, Math.min(200, bpm));
    }

    tick() {
        if (!this.isPlaying || !this.audioCtx) return;

        const chordIdx = Math.floor(this.step / 4) % 4;
        const noteIdx = this.step % 4;
        const chord = this.progression[chordIdx];
        const freq = chord[noteIdx];

        this.playMelodyNote(freq, 0.12);

        // Sub bass kick on beat 0 of each bar
        if (noteIdx === 0) {
            this.playBassNote(chord[0] / 2, 0.24);
        }

        this.step = (this.step + 1) % 16;
        const intervalMs = (60 / this.tempo / 2) * 1000;
        this.timerId = setTimeout(() => this.tick(), intervalMs);
    }

    playMelodyNote(freq, duration) {
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {}
    }

    playBassNote(freq, duration) {
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

            gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {}
    }
}

// =============================================================================
// 2. 2D Canvas Confetti Particle Engine
// =============================================================================

class SigniConfettiEngine {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animId = null;
        this.colors = ['#6366f1', '#ec4899', '#38bdf8', '#10b981', '#fbbf24', '#f43f5e', '#a855f7'];
    }

    burst(count = 50) {
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width || 600;
        this.canvas.height = rect.height || 220;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: this.canvas.width * 0.5 + (Math.random() - 0.5) * 80,
                y: this.canvas.height * 0.4 + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 10,
                vy: -Math.random() * 7 - 2,
                size: Math.random() * 7 + 4,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 14,
                alpha: 1,
                decay: Math.random() * 0.018 + 0.012
            });
        }

        if (!this.animId) {
            this.loop();
        }
    }

    loop() {
        if (!this.canvas || !this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.22; // gravity
            p.rotation += p.vRot;
            p.alpha -= p.decay;

            if (p.alpha <= 0 || p.y > this.canvas.height) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
            this.ctx.restore();
        }

        if (this.particles.length > 0) {
            this.animId = requestAnimationFrame(() => this.loop());
        } else {
            this.animId = null;
        }
    }

    clear() {
        this.particles = [];
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// =============================================================================
// 3. Main Signi Companion Class
// =============================================================================

class SigniCompanion {
    constructor() {
        this.currentState = 'idle';
        this.voiceEnabled = localStorage.getItem('signi_voice_enabled') !== 'false';
        this.isChatOpen = false;
        this.isFunModalOpen = false;
        this.isListening = false;
        this.recognition = null;
        this.speechSynthesis = window.speechSynthesis || null;
        this.balloonTimer = null;
        this.currentActionTimer = null;

        // Music & Particle Engines
        this.synth = new SigniDanceSynthesizer();
        this.confettiEngine = null;
        this.isMusicPlaying = false;

        // Catalog of 22 Interactive Fun Mode Actions
        this.funActions = [
            { id: 'dance', label: '💃 Dance', state: 'dancing', speech: "Let's dance! Feel the rhythm!", bubble: "💃 Dancing to the groove!" },
            { id: 'dance_fast', label: '🕺 Dance Faster', state: 'dancing_fast', speech: "Speeding up! Can you keep up?", bubble: "⚡ Turbo dance speed!" },
            { id: 'random_dance', label: '🕺 Random Dance', state: 'dancing', speech: "Freestyle dance mode! Let's groove!", bubble: "🕺 Freestyle groove!" },
            { id: 'wave', label: '👋 Wave', state: 'waving', speech: "Hello there, friend! Waving back at you!", bubble: "👋 Waving hello!" },
            { id: 'love', label: '❤️ Send Love', state: 'cute', speech: "Sending you lots of love and positivity!", bubble: "❤️ Lots of love for you!" },
            { id: 'laugh', label: '😂 Laugh', state: 'laughing', speech: "Haha! That's hilarious! So funny!", bubble: "😂 Hahaha! That's hilarious!" },
            { id: 'sleep', label: '😴 Sleep', state: 'sleeping', speech: "Shhh... taking a cozy power nap. Sweet dreams!", bubble: "😴 Zzz... Power napping..." },
            { id: 'surprise', label: '😮 Surprise', state: 'surprised', speech: "Whoa! I didn't see that coming!", bubble: "😮 Whoa! What a surprise!" },
            { id: 'cool', label: '😎 Cool Pose', state: 'cool', speech: "Check out these shades. Always keeping it cool!", bubble: "😎 Pure AI cool vibes." },
            { id: 'celebrate', label: '🎉 Celebrate', state: 'celebrating', speech: "Woohoo! Let's celebrate our achievements!", bubble: "🎉 Celebration time! Yay!" },
            { id: 'clap', label: '👏 Clap', state: 'clapping', speech: "Bravo! Fantastic job! Round of applause!", bubble: "👏 Clapping for you! Bravo!" },
            { id: 'jump', label: '🦘 Jump', state: 'jumping', speech: "Boing! Boing! Jumping high in the air!", bubble: "🦘 Boing! Jumping for joy!" },
            { id: 'spin', label: '🌀 Spin', state: 'spinning', speech: "Wheeee! Look at me spinning round and round!", bubble: "🌀 Wheeee! Full 360 spin!" },
            { id: 'party', label: '🥳 Party', state: 'party', speech: "Party mode activated! Let's have fun together!", bubble: "🥳 Party mode on!" },
            { id: 'flex', label: '💪 Flex', state: 'flexing', speech: "Check out these neural network muscles!", bubble: "💪 Flexing my AI muscles!" },
            { id: 'hello', label: '👋 Say Hello', state: 'waving', speech: "Hello! Welcome to SignSpeak AI!", bubble: "👋 Hello and welcome!" },
            { id: 'hug', label: '🤗 Give a Hug', state: 'hugging', speech: "Sending a big, warm, fuzzy virtual hug!", bubble: "🤗 Sending you a big warm hug!" },
            { id: 'cry', label: '😭 Cry', state: 'crying', speech: "Sniff... happy tears because you're awesome!", bubble: "😭 Sniff... crying happy tears!" },
            { id: 'angry', label: '😡 Get Angry', state: 'angry', speech: "Grrr! I'm a little grumpy, but still fond of you!", bubble: "😡 Grrr! Mildly frustrated!" },
            { id: 'cute', label: '🥰 Be Cute', state: 'cute', speech: "Aww, thank you! I'm happy to be your buddy!", bubble: "🥰 Sparkles and cuteness!" },
            { id: 'silly', label: '🐰 Act Silly', state: 'silly', speech: "Blehh! Making silly faces is the best!", bubble: "🐰 Blehhh! Silly face time!" },
            { id: 'sing', label: '🎤 Sing', state: 'singing', speech: "Do-Re-Mi~ singing a cheerful melody for you!", bubble: "🎤 La la la~ singing for you! 🎵" }
        ];

        this.init();
    }

    init() {
        this.injectFloatingWidget();
        this.injectFunModal();
        this.initSpeechRecognition();
        this.initSuggestedEvents();
        this.renderContextualAvatars();
    }

    // ==========================================================================
    // Dynamic SVG Mascot Generator (25 Highly Expressive States)
    // ==========================================================================

    generateSvg(size = 56, state = 'idle') {
        const uniqueId = 'signi_' + Math.random().toString(36).substr(2, 6);

        let eyeLeftSvg = '';
        let eyeRightSvg = '';
        let mouthSvg = '';
        let accessoriesSvg = '';

        switch (state) {
            case 'happy':
            case 'excited':
            case 'celebrating':
            case 'clapping':
            case 'jumping':
                eyeLeftSvg = `<path d="M28 35 Q34 27 40 35" stroke="#312e81" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
                eyeRightSvg = `<path d="M60 35 Q66 27 72 35" stroke="#312e81" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
                mouthSvg = `<path class="signi-mouth" d="M42 53 Q50 64 58 53 Z" fill="#ec4899"/>`;
                accessoriesSvg = `<polygon points="50,6 52,11 58,11 53,15 55,20 50,17 45,20 47,15 42,11 48,11" fill="#fbbf24"/>`;
                break;

            case 'dancing':
            case 'dancing_fast':
            case 'party':
                eyeLeftSvg = `<path d="M28 35 Q34 26 40 35" stroke="#312e81" stroke-width="3.6" stroke-linecap="round" fill="none"/>`;
                eyeRightSvg = `<path d="M60 35 Q66 26 72 35" stroke="#312e81" stroke-width="3.6" stroke-linecap="round" fill="none"/>`;
                mouthSvg = `<path class="signi-mouth" d="M41 52 Q50 65 59 52 Z" fill="#ec4899"/>`;
                accessoriesSvg = `
                    <circle cx="16" cy="22" r="3" fill="#38bdf8"/>
                    <text x="74" y="22" font-family="sans-serif" font-size="14" fill="#ec4899">♪</text>
                `;
                break;

            case 'cool':
                // Sleek Sunglasses with Glint
                eyeLeftSvg = ``;
                eyeRightSvg = ``;
                mouthSvg = `<path class="signi-mouth" d="M44 55 Q52 59 58 54" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                accessoriesSvg = `
                    <g class="signi-sunglasses">
                        <rect x="22" y="27" width="25" height="16" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
                        <rect x="53" y="27" width="25" height="16" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
                        <line x1="47" y1="33" x2="53" y2="33" stroke="#0f172a" stroke-width="3"/>
                        <line x1="25" y1="30" x2="38" y2="30" stroke="#ffffff" stroke-width="1.5" opacity="0.7"/>
                        <line x1="56" y1="30" x2="69" y2="30" stroke="#ffffff" stroke-width="1.5" opacity="0.7"/>
                    </g>
                `;
                break;

            case 'sleeping':
                // Cozy sleeping curves & floating Zzz
                eyeLeftSvg = `<path d="M28 37 Q34 42 40 37" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                eyeRightSvg = `<path d="M60 37 Q66 42 72 37" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                mouthSvg = `<path class="signi-mouth" d="M46 54 Q50 56 54 54" stroke="#312e81" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
                accessoriesSvg = `
                    <text x="68" y="22" font-family="sans-serif" font-weight="900" font-size="11" fill="#818cf8" opacity="0.9">Z</text>
                    <text x="77" y="16" font-family="sans-serif" font-weight="900" font-size="8" fill="#a5b4fc" opacity="0.7">z</text>
                `;
                break;

            case 'surprised':
                // Wide open round eyes and 'O' mouth
                eyeLeftSvg = `<circle class="signi-eye" cx="34" cy="35" r="8" fill="#312e81"/><circle cx="34" cy="35" r="4.2" fill="#ffffff"/>`;
                eyeRightSvg = `<circle class="signi-eye" cx="66" cy="35" r="8" fill="#312e81"/><circle cx="66" cy="35" r="4.2" fill="#ffffff"/>`;
                mouthSvg = `<circle class="signi-mouth" cx="50" cy="55" r="5.5" fill="#312e81"/>`;
                break;

            case 'laughing':
                // Laughing squint eyes (> <) and open mouth
                eyeLeftSvg = `<path d="M27 36 L34 31 L41 36" stroke="#312e81" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
                eyeRightSvg = `<path d="M59 36 L66 31 L73 36" stroke="#312e81" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
                mouthSvg = `<path class="signi-mouth" d="M40 51 Q50 66 60 51 Z" fill="#f43f5e"/>`;
                break;

            case 'cute':
            case 'love':
                // Sparkle anime eyes & extra blush
                eyeLeftSvg = `
                    <g class="signi-eye">
                        <circle cx="34" cy="35" r="7.5" fill="#312e81"/>
                        <circle cx="36.5" cy="32" r="3.2" fill="#ffffff"/>
                        <circle cx="32" cy="38" r="1.5" fill="#ffffff"/>
                        <circle cx="36" cy="39" r="1" fill="#ffffff"/>
                    </g>`;
                eyeRightSvg = `
                    <g class="signi-eye">
                        <circle cx="66" cy="35" r="7.5" fill="#312e81"/>
                        <circle cx="68.5" cy="32" r="3.2" fill="#ffffff"/>
                        <circle cx="64" cy="38" r="1.5" fill="#ffffff"/>
                        <circle cx="68" cy="39" r="1" fill="#ffffff"/>
                    </g>`;
                mouthSvg = `<path class="signi-mouth" d="M44 54 Q47 57 50 54 Q53 57 56 54" stroke="#ec4899" stroke-width="3" stroke-linecap="round" fill="none"/>`;
                accessoriesSvg = `<text x="72" y="24" font-family="sans-serif" font-size="14" fill="#ec4899">❤️</text>`;
                break;

            case 'silly':
                // Left eye winking, right eye open, silly tongue out
                eyeLeftSvg = `<path d="M28 35 Q34 27 40 35" stroke="#312e81" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
                eyeRightSvg = `<circle class="signi-eye" cx="66" cy="35" r="7" fill="#312e81"/><circle cx="68" cy="33" r="2.5" fill="#ffffff"/>`;
                mouthSvg = `
                    <path class="signi-mouth" d="M43 53 Q50 58 57 53" stroke="#312e81" stroke-width="3" stroke-linecap="round" fill="none"/>
                    <path d="M47 55 Q50 63 53 55 Z" fill="#f43f5e"/>
                `;
                break;

            case 'singing':
                eyeLeftSvg = `<path d="M28 35 Q34 28 40 35" stroke="#312e81" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
                eyeRightSvg = `<path d="M60 35 Q66 28 72 35" stroke="#312e81" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
                mouthSvg = `<ellipse class="signi-mouth" cx="50" cy="55" rx="4.5" ry="6.5" fill="#312e81"/>`;
                accessoriesSvg = `
                    <text x="18" y="24" font-family="sans-serif" font-size="14" fill="#ec4899">♪</text>
                    <text x="72" y="22" font-family="sans-serif" font-size="16" fill="#6366f1">♫</text>
                `;
                break;

            case 'sad':
            case 'crying':
                eyeLeftSvg = `<path d="M28 37 Q34 32 40 37" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                eyeRightSvg = `<path d="M60 37 Q66 32 72 37" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                mouthSvg = `<path class="signi-mouth" d="M44 57 Q50 52 56 57" stroke="#312e81" stroke-width="3" stroke-linecap="round" fill="none"/>`;
                accessoriesSvg = `
                    <path d="M26 43 C24 48, 28 48, 26 43 Z" fill="#38bdf8"/>
                    <path d="M74 43 C72 48, 76 48, 74 43 Z" fill="#38bdf8"/>
                `;
                break;

            case 'angry':
                eyeLeftSvg = `
                    <line x1="26" y1="28" x2="40" y2="33" stroke="#e11d48" stroke-width="2.8" stroke-linecap="round"/>
                    <circle class="signi-eye" cx="34" cy="37" r="5.5" fill="#312e81"/>
                `;
                eyeRightSvg = `
                    <line x1="74" y1="28" x2="60" y2="33" stroke="#e11d48" stroke-width="2.8" stroke-linecap="round"/>
                    <circle class="signi-eye" cx="66" cy="37" r="5.5" fill="#312e81"/>
                `;
                mouthSvg = `<path class="signi-mouth" d="M44 57 Q50 52 56 57" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                break;

            case 'flexing':
                eyeLeftSvg = `
                    <line x1="27" y1="30" x2="40" y2="32" stroke="#312e81" stroke-width="2.4" stroke-linecap="round"/>
                    <circle class="signi-eye" cx="34" cy="36" r="6" fill="#312e81"/>
                `;
                eyeRightSvg = `
                    <line x1="73" y1="30" x2="60" y2="32" stroke="#312e81" stroke-width="2.4" stroke-linecap="round"/>
                    <circle class="signi-eye" cx="66" cy="36" r="6" fill="#312e81"/>
                `;
                mouthSvg = `<path class="signi-mouth" d="M43 54 Q50 58 57 52" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                break;

            case 'listening':
                eyeLeftSvg = `<circle class="signi-eye" cx="34" cy="35" r="7.5" fill="#312e81"/><circle cx="36" cy="33" r="2.5" fill="#ffffff"/>`;
                eyeRightSvg = `<circle class="signi-eye" cx="66" cy="35" r="7.5" fill="#312e81"/><circle cx="68" cy="33" r="2.5" fill="#ffffff"/>`;
                mouthSvg = `<ellipse class="signi-mouth" cx="50" cy="55" rx="4" ry="5.5" fill="#312e81"/>`;
                break;

            case 'thinking':
                eyeLeftSvg = `<circle class="signi-eye" cx="35" cy="32" r="6" fill="#312e81"/><circle cx="37" cy="30" r="2" fill="#ffffff"/>`;
                eyeRightSvg = `<circle class="signi-eye" cx="67" cy="32" r="6" fill="#312e81"/><circle cx="69" cy="30" r="2" fill="#ffffff"/>`;
                mouthSvg = `<path class="signi-mouth" d="M44 54 Q50 51 56 54" stroke="#312e81" stroke-width="3" stroke-linecap="round" fill="none"/>`;
                break;

            case 'spinning':
                eyeLeftSvg = `<circle class="signi-eye" cx="34" cy="35" r="6" fill="#6366f1"/><circle cx="36" cy="33" r="2" fill="#ffffff"/>`;
                eyeRightSvg = `<circle class="signi-eye" cx="66" cy="35" r="6" fill="#6366f1"/><circle cx="68" cy="33" r="2" fill="#ffffff"/>`;
                mouthSvg = `<path class="signi-mouth" d="M43 53 Q50 62 57 53 Z" fill="#ec4899"/>`;
                break;

            default:
                // Idle & Talking
                eyeLeftSvg = `
                    <g class="signi-eye">
                        <circle cx="34" cy="35" r="6.8" fill="#312e81"/>
                        <circle cx="36.5" cy="32.5" r="2.4" fill="#ffffff"/>
                        <circle cx="32" cy="37" r="1.1" fill="#ffffff"/>
                    </g>`;
                eyeRightSvg = `
                    <g class="signi-eye">
                        <circle cx="66" cy="35" r="6.8" fill="#312e81"/>
                        <circle cx="68.5" cy="32.5" r="2.4" fill="#ffffff"/>
                        <circle cx="64" cy="37" r="1.1" fill="#ffffff"/>
                    </g>`;
                mouthSvg = `<path class="signi-mouth" d="M43 53 Q50 60 57 53" stroke="#312e81" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
                break;
        }

        return `
            <svg class="signi-avatar-svg signi-state-${state}" width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Signi AI Companion">
                <defs>
                    <linearGradient id="bodyGrad_${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="60%" stop-color="#f1f5f9"/>
                        <stop offset="100%" stop-color="#e0e7ff"/>
                    </linearGradient>
                    <linearGradient id="earGrad_${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#6366f1"/>
                        <stop offset="100%" stop-color="#ec4899"/>
                    </linearGradient>
                    <radialGradient id="haloGrad_${uniqueId}" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="rgba(99, 102, 241, 0.4)"/>
                        <stop offset="100%" stop-color="rgba(99, 102, 241, 0)"/>
                    </radialGradient>
                </defs>

                <!-- Ambient Halo Glow -->
                <circle class="signi-halo" cx="50" cy="50" r="46" fill="url(#haloGrad_${uniqueId})"/>

                <!-- Animated Character Body Group -->
                <g class="signi-body-group">
                    <!-- Cyber Ears / Antennae -->
                    <circle cx="15" cy="40" r="7.5" fill="url(#earGrad_${uniqueId})"/>
                    <circle cx="15" cy="40" r="3.5" fill="#38bdf8"/>

                    <circle cx="85" cy="40" r="7.5" fill="url(#earGrad_${uniqueId})"/>
                    <circle cx="85" cy="40" r="3.5" fill="#38bdf8"/>

                    <!-- Main Cute Head Base -->
                    <rect x="18" y="14" width="64" height="64" rx="28" fill="url(#bodyGrad_${uniqueId})" stroke="#cbd5e1" stroke-width="2"/>

                    <!-- Glossy Glass Screen Reflection -->
                    <path d="M 26 22 Q 50 16 74 22 A 24 24 0 0 1 76 34 Q 50 26 24 34 A 24 24 0 0 1 26 22 Z" fill="#ffffff" opacity="0.6"/>

                    <!-- Cheerful Pink Blush -->
                    <ellipse class="signi-blush" cx="25" cy="47" rx="5.2" ry="3.2" fill="#f472b6"/>
                    <ellipse class="signi-blush" cx="75" cy="47" rx="5.2" ry="3.2" fill="#f472b6"/>

                    <!-- Eyes & Mouth -->
                    ${eyeLeftSvg}
                    ${eyeRightSvg}
                    ${mouthSvg}

                    <!-- Accessory Elements -->
                    ${accessoriesSvg}

                    <!-- Floating Hands -->
                    <g class="signi-hand-left">
                        <circle cx="14" cy="68" r="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
                    </g>
                    <g class="signi-hand-right">
                        <circle cx="86" cy="68" r="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
                    </g>
                </g>
            </svg>
        `;
    }

    // ==========================================================================
    // State Controller
    // ==========================================================================

    setState(state, autoRevertMs = 0) {
        this.currentState = state;
        document.querySelectorAll('.signi-avatar-box').forEach(box => {
            const size = parseInt(box.getAttribute('data-size') || '56');
            box.innerHTML = this.generateSvg(size, state);
        });

        const badge = document.getElementById('signi-stage-badge');
        if (badge) {
            badge.textContent = `STATE: ${state.toUpperCase().replace('_', ' ')}`;
        }

        if (this.currentActionTimer) {
            clearTimeout(this.currentActionTimer);
            this.currentActionTimer = null;
        }

        if (autoRevertMs > 0) {
            this.currentActionTimer = setTimeout(() => {
                if (this.currentState === state) {
                    this.setState('idle');
                }
            }, autoRevertMs);
        }
    }

    // ==========================================================================
    // Speech Synthesis
    // ==========================================================================

    speak(text, onComplete = null) {
        if (!text || !this.speechSynthesis) {
            if (onComplete) onComplete();
            return;
        }

        this.speechSynthesis.cancel();

        if (!this.voiceEnabled) {
            if (onComplete) onComplete();
            return;
        }

        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1.25;

        const voices = this.speechSynthesis.getVoices();
        const bestVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Natural') || v.name.includes('Google')));
        if (bestVoice) utterance.voice = bestVoice;

        const originalState = this.currentState;

        utterance.onstart = () => {
            if (this.currentState === 'idle') {
                this.setState('talking');
            }
        };

        utterance.onend = () => {
            if (this.currentState === 'talking') {
                this.setState(originalState === 'talking' ? 'idle' : originalState);
            }
            if (onComplete) onComplete();
        };

        utterance.onerror = () => {
            if (this.currentState === 'talking') {
                this.setState('idle');
            }
            if (onComplete) onComplete();
        };

        this.speechSynthesis.speak(utterance);
    }

    stopSpeaking() {
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
            if (this.currentState === 'talking') {
                this.setState('idle');
            }
        }
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        localStorage.setItem('signi_voice_enabled', this.voiceEnabled);

        const btn = document.getElementById('signi-voice-toggle');
        if (btn) {
            btn.innerHTML = `<i class="fas fa-volume-${this.voiceEnabled ? 'high' : 'xmark'}"></i>`;
            btn.title = `Signi Voice: ${this.voiceEnabled ? 'ON' : 'OFF'}`;
            btn.classList.toggle('active', this.voiceEnabled);
        }

        showToast(`Signi Voice: ${this.voiceEnabled ? 'Enabled' : 'Muted'}`, 'info', 1800);
        if (this.voiceEnabled) {
            this.speak("Voice enabled! I'm ready to talk.");
        } else {
            this.stopSpeaking();
        }
    }

    // ==========================================================================
    // Speech Recognition (Voice Input for Chatbot)
    // ==========================================================================

    initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
        if (!SpeechRec) return;

        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.setState('listening');
            const micBtn = document.getElementById('signi-mic-btn');
            if (micBtn) micBtn.classList.add('listening');
            showToast('Listening... Speak to Signi', 'info', 2000);
        };

        this.recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            const inputField = document.getElementById('signi-input');
            if (inputField) {
                inputField.value = transcript;
                this.handleUserSubmit(transcript);
            }
        };

        this.recognition.onerror = () => {
            this.stopListening();
            showToast("Couldn't hear you clearly. Try typing!", 'info', 2200);
        };

        this.recognition.onend = () => {
            this.stopListening();
        };
    }

    toggleListening() {
        if (!this.recognition) {
            showToast('Voice input is not supported in this browser. You can type anytime!', 'info', 3000);
            return;
        }

        if (this.isListening) {
            this.stopListening();
        } else {
            try {
                this.recognition.start();
            } catch (e) {
                this.stopListening();
            }
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) {}
        }
        const micBtn = document.getElementById('signi-mic-btn');
        if (micBtn) micBtn.classList.remove('listening');
        if (this.currentState === 'listening') {
            this.setState('idle');
        }
    }

    // ==========================================================================
    // Floating Mascot Widget Injection
    // ==========================================================================

    injectFloatingWidget() {
        if (document.getElementById('signi-float-container')) return;

        const container = document.createElement('div');
        container.id = 'signi-float-container';
        container.className = 'signi-float-widget';

        container.innerHTML = `
            <!-- Contextual Balloon with Play Shortcut -->
            <div id="signi-speech-balloon" class="signi-speech-balloon" style="display: none;" onclick="window.signi.openChat()">
                <span id="signi-balloon-text">👋 Hi! I'm Signi. Tap to chat or play!</span>
                <button type="button" class="btn btn-sm btn-gradient" style="padding: 0.2rem 0.65rem; font-size: 0.76rem; border-radius: var(--radius-pill); margin-left: 0.4rem;" onclick="event.stopPropagation(); window.signi.openFunMode();">
                    ✨ Play
                </button>
                <button class="signi-balloon-close" onclick="event.stopPropagation(); window.signi.dismissBalloon();" title="Dismiss">✕</button>
            </div>

            <!-- Floating Button -->
            <button id="signi-launch-btn" class="signi-float-btn" onclick="window.signi.toggleChat()" aria-label="Open Signi AI Companion">
                <div class="signi-avatar-box" data-size="48">
                    ${this.generateSvg(48, 'idle')}
                </div>
                <div class="signi-beacon-dot" title="Signi Online"></div>
            </button>

            <!-- Chatbot Panel -->
            <div id="signi-chat-panel" class="signi-chat-panel hidden" role="dialog" aria-label="Signi AI Assistant">
                <!-- Header -->
                <div class="signi-chat-header">
                    <div class="signi-chat-header-info">
                        <div class="signi-avatar-box signi-header-avatar" data-size="36">
                            ${this.generateSvg(36, 'idle')}
                        </div>
                        <div>
                            <div class="signi-chat-title">Signi <span class="gradient-text">Companion</span></div>
                            <span class="signi-status-pill">Ready to Help</span>
                        </div>
                    </div>
                    <div class="signi-chat-actions">
                        <button class="signi-tool-btn" onclick="window.signi.openFunMode()" title="✨ Play with Signi (Fun Mode)">
                            <i class="fas fa-gamepad"></i>
                        </button>
                        <button id="signi-voice-toggle" class="signi-tool-btn ${this.voiceEnabled ? 'active' : ''}" onclick="window.signi.toggleVoice()" title="Signi Voice: ${this.voiceEnabled ? 'ON' : 'OFF'}">
                            <i class="fas fa-volume-${this.voiceEnabled ? 'high' : 'xmark'}"></i>
                        </button>
                        <button class="signi-tool-btn" onclick="window.signi.toggleChat()" title="Minimize Assistant">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>

                <!-- Messages Stream -->
                <div id="signi-chat-messages" class="signi-chat-messages">
                    <div class="signi-msg bot">
                        <div class="signi-avatar-box" data-size="28" style="flex-shrink:0;">
                            ${this.generateSvg(28, 'happy')}
                        </div>
                        <div class="signi-msg-bubble">
                            👋 Hi! I'm <strong>Signi</strong>, your AI communication buddy. I can show you how to sign, help you use the camera, or we can play fun actions together!
                        </div>
                    </div>
                </div>

                <!-- Quick Prompt Chips -->
                <div class="signi-chat-suggestions">
                    <button class="signi-chip-btn" style="background: rgba(236, 72, 153, 0.1); border-color: rgba(236, 72, 153, 0.3); color: var(--brand-pink); font-weight: 700;" onclick="window.signi.openFunMode()">
                        <i class="fas fa-wand-magic-sparkles"></i> ✨ Play with Signi
                    </button>
                    <button class="signi-chip-btn" onclick="window.signi.handleUserSubmit('How do I use SignSpeak?')">
                        <i class="fas fa-circle-question"></i> How do I use SignSpeak?
                    </button>
                    <button class="signi-chip-btn" onclick="window.signi.handleUserSubmit('Show me Thank You')">
                        <i class="fas fa-hand-holding-heart"></i> Show me Thank You
                    </button>
                    <button class="signi-chip-btn" onclick="window.signi.handleUserSubmit('Show me the alphabet')">
                        <i class="fas fa-book-open"></i> Show alphabet
                    </button>
                    <button class="signi-chip-btn" onclick="window.signi.handleUserSubmit('Speak my message')">
                        <i class="fas fa-volume-high"></i> Speak my message
                    </button>
                    <button class="signi-chip-btn" onclick="window.signi.handleUserSubmit('How does camera mode work?')">
                        <i class="fas fa-camera"></i> Camera tips
                    </button>
                </div>

                <!-- Input Controls -->
                <form class="signi-chat-input-bar" onsubmit="event.preventDefault(); window.signi.submitChatInput();">
                    <input type="text" id="signi-input" class="signi-input-field" placeholder="Ask Signi anything..." autocomplete="off">
                    <button type="button" id="signi-mic-btn" class="signi-mic-btn" onclick="window.signi.toggleListening()" title="Speak to Signi">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button type="submit" class="signi-send-btn" title="Send Question">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        `;

        document.body.appendChild(container);

        setTimeout(() => {
            this.showBalloon("👋 Hi there! I'm Signi. Tap me to chat or play together!", 6500);
        }, 2200);
    }

    showBalloon(text, duration = 5000) {
        const balloon = document.getElementById('signi-speech-balloon');
        const textElem = document.getElementById('signi-balloon-text');
        if (!balloon || !textElem || this.isChatOpen || this.isFunModalOpen) return;

        textElem.textContent = text;
        balloon.style.display = 'flex';

        if (this.balloonTimer) clearTimeout(this.balloonTimer);
        this.balloonTimer = setTimeout(() => {
            this.dismissBalloon();
        }, duration);
    }

    dismissBalloon() {
        const balloon = document.getElementById('signi-speech-balloon');
        if (balloon) balloon.style.display = 'none';
        if (this.balloonTimer) clearTimeout(this.balloonTimer);
    }

    toggleChat() {
        if (this.isChatOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const panel = document.getElementById('signi-chat-panel');
        if (panel) {
            panel.classList.remove('hidden');
            this.isChatOpen = true;
            this.dismissBalloon();
            const input = document.getElementById('signi-input');
            if (input) setTimeout(() => input.focus(), 250);
            this.setState('happy', 800);
        }
    }

    closeChat() {
        const panel = document.getElementById('signi-chat-panel');
        if (panel) {
            panel.classList.add('hidden');
            this.isChatOpen = false;
            this.stopSpeaking();
            this.stopListening();
        }
    }

    submitChatInput() {
        const input = document.getElementById('signi-input');
        if (!input) return;
        const query = input.value.trim();
        if (!query) return;
        input.value = '';
        this.handleUserSubmit(query);
    }

    // ==========================================================================
    // Fun Mode ("Play with Signi") Modal Injection & Controls
    // ==========================================================================

    injectFunModal() {
        if (document.getElementById('signi-fun-modal')) return;

        const modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'signi-fun-modal';
        modalBackdrop.className = 'signi-fun-modal-backdrop';
        modalBackdrop.onclick = (e) => this.handleModalBackdropClick(e);

        // Generate action buttons
        const actionButtonsHtml = this.funActions.map(action => `
            <button class="signi-action-btn" data-action="${action.id}" onclick="window.signi.executeAction('${action.id}')">
                <span>${action.label}</span>
            </button>
        `).join('');

        modalBackdrop.innerHTML = `
            <div class="signi-fun-dialog" role="dialog" aria-modal="true" aria-labelledby="signi-fun-title">
                <!-- Modal Header -->
                <div class="signi-fun-header">
                    <div class="signi-fun-title" id="signi-fun-title">
                        <span>🎮</span> Play with Signi <span class="gradient-text">Fun Mode</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="btn btn-sm btn-outline-danger" onclick="window.signi.stopAll()" title="Stop all actions">
                            <i class="fas fa-stop"></i> Stop
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.signi.closeFunMode()" title="Close Fun Mode">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <!-- Interactive Center Stage -->
                <div class="signi-fun-stage">
                    <div class="signi-stage-spotlight"></div>
                    <canvas id="signi-confetti-canvas"></canvas>

                    <div id="signi-stage-avatar-box" class="signi-stage-avatar signi-avatar-box" data-size="120">
                        ${this.generateSvg(120, 'idle')}
                    </div>

                    <div id="signi-stage-bubble" class="signi-stage-speech-bubble">
                        ✨ Hi! What should we do together? Pick an action or tell me below!
                    </div>

                    <div id="signi-stage-badge" class="signi-stage-status-badge">
                        STATE: IDLE
                    </div>
                </div>

                <!-- Dance & Play Controller Deck -->
                <div class="signi-dance-deck">
                    <button id="signi-music-btn" class="btn btn-sm btn-outline-primary" onclick="window.signi.toggleDanceMusic()" title="Toggle Dance Music">
                        <i class="fas fa-music"></i> Music: OFF
                    </button>

                    <div class="btn-group" role="group" aria-label="Dance Tempo">
                        <button id="signi-tempo-slow" class="btn btn-sm btn-secondary" onclick="window.signi.setTempo('slow')">🐢 Slow</button>
                        <button id="signi-tempo-normal" class="btn btn-sm btn-primary active" onclick="window.signi.setTempo('normal')">🕺 Normal</button>
                        <button id="signi-tempo-fast" class="btn btn-sm btn-secondary" onclick="window.signi.setTempo('fast')">⚡ Fast</button>
                    </div>

                    <button class="btn btn-sm btn-gradient" onclick="window.signi.triggerSurprise()" title="Pick random fun action">
                        <i class="fas fa-dice"></i> Surprise Me!
                    </button>
                </div>

                <!-- Command Box Bar -->
                <form class="signi-cmd-bar" onsubmit="event.preventDefault(); window.signi.submitFunCommand();">
                    <input type="text" id="signi-cmd-input" class="signi-cmd-input" placeholder="Tell Signi what to do... (e.g. 'Dance for me', 'Make me laugh', 'Spin around')" autocomplete="off">
                    <button type="button" id="signi-cmd-mic-btn" class="signi-mic-btn" onclick="window.signi.toggleFunMic()" title="Talk to Signi">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button type="submit" class="signi-send-btn" title="Run Command">
                        <i class="fas fa-wand-magic-sparkles"></i>
                    </button>
                </form>

                <!-- Actions Catalog Grid -->
                <div class="signi-fun-grid-container">
                    <div class="signi-fun-grid-title">
                        🎮 WHAT SHOULD SIGNI DO? (22 FUN ACTIONS)
                    </div>
                    <div class="signi-fun-actions-grid">
                        ${actionButtonsHtml}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalBackdrop);
    }

    openFunMode() {
        this.injectFunModal();
        const modal = document.getElementById('signi-fun-modal');
        if (modal) {
            modal.classList.add('open');
            this.isFunModalOpen = true;
            this.dismissBalloon();

            const stageBox = document.getElementById('signi-stage-avatar-box');
            if (stageBox) {
                stageBox.innerHTML = this.generateSvg(120, this.currentState);
            }

            if (!this.confettiEngine) {
                this.confettiEngine = new SigniConfettiEngine('signi-confetti-canvas');
            }

            const input = document.getElementById('signi-cmd-input');
            if (input) setTimeout(() => input.focus(), 250);
        }
    }

    closeFunMode() {
        const modal = document.getElementById('signi-fun-modal');
        if (modal) {
            modal.classList.remove('open');
            this.isFunModalOpen = false;

            // Stop music if playing when modal is closed
            if (this.isMusicPlaying) {
                this.toggleDanceMusic();
            }
        }
    }

    handleModalBackdropClick(event) {
        if (event.target.id === 'signi-fun-modal') {
            this.closeFunMode();
        }
    }

    executeAction(actionKey) {
        const action = this.funActions.find(a => a.id === actionKey);
        if (!action) return;

        // Highlight selected button
        document.querySelectorAll('.signi-action-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-action') === actionKey);
        });

        // Update stage bubble & status
        const bubble = document.getElementById('signi-stage-bubble');
        if (bubble) bubble.innerHTML = action.bubble;

        const badge = document.getElementById('signi-stage-badge');
        if (badge) badge.textContent = `STATE: ${action.state.toUpperCase().replace('_', ' ')}`;

        // Trigger animation state
        this.setState(action.state);

        // Confetti burst on high energy actions
        if (['celebrate', 'party', 'dance', 'dance_fast', 'random_dance', 'jump'].includes(actionKey)) {
            if (this.confettiEngine) {
                this.confettiEngine.burst(50);
            }
        }

        // Speak cheerful voice line
        this.speak(action.speech);

        // Adjust dance tempo if music is running
        if (actionKey === 'dance_fast') {
            this.synth.setTempo(160);
            this.updateTempoButtons('fast');
        } else if (actionKey === 'dance' || actionKey === 'random_dance') {
            this.synth.setTempo(120);
            this.updateTempoButtons('normal');
        }
    }

    stopAll() {
        // Stop audio synth
        if (this.synth) {
            this.synth.stop();
        }
        this.isMusicPlaying = false;
        const musicBtn = document.getElementById('signi-music-btn');
        if (musicBtn) {
            musicBtn.innerHTML = `<i class="fas fa-music"></i> Music: OFF`;
            musicBtn.classList.remove('active');
        }

        // Stop voice
        this.stopSpeaking();

        // Clear particles
        if (this.confettiEngine) {
            this.confettiEngine.clear();
        }

        // Reset state
        this.setState('idle');

        // Reset stage elements
        const bubble = document.getElementById('signi-stage-bubble');
        if (bubble) bubble.innerHTML = `✨ Back to idle! What should we do next?`;

        const badge = document.getElementById('signi-stage-badge');
        if (badge) badge.textContent = `STATE: IDLE`;

        document.querySelectorAll('.signi-action-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        showToast('Signi stopped and returned to idle', 'info', 1800);
    }

    toggleDanceMusic() {
        this.isMusicPlaying = !this.isMusicPlaying;
        const musicBtn = document.getElementById('signi-music-btn');

        if (this.isMusicPlaying) {
            this.synth.start();
            if (musicBtn) {
                musicBtn.innerHTML = `<i class="fas fa-volume-high"></i> Music: ON`;
                musicBtn.classList.add('active');
            }
            showToast('Dance music playing 🎵', 'info', 1800);
            if (!['dancing', 'dancing_fast', 'party'].includes(this.currentState)) {
                this.executeAction('dance');
            }
        } else {
            this.synth.stop();
            if (musicBtn) {
                musicBtn.innerHTML = `<i class="fas fa-music"></i> Music: OFF`;
                musicBtn.classList.remove('active');
            }
            showToast('Dance music stopped', 'info', 1800);
        }
    }

    setTempo(tempoName) {
        let bpm = 120;
        if (tempoName === 'slow') bpm = 90;
        else if (tempoName === 'normal') bpm = 120;
        else if (tempoName === 'fast') bpm = 160;

        this.synth.setTempo(bpm);
        this.updateTempoButtons(tempoName);

        if (tempoName === 'fast' && this.currentState === 'dancing') {
            this.executeAction('dance_fast');
        } else if (tempoName === 'slow' && this.currentState === 'dancing_fast') {
            this.executeAction('dance');
        }
    }

    updateTempoButtons(activeTempo) {
        ['slow', 'normal', 'fast'].forEach(t => {
            const btn = document.getElementById(`signi-tempo-${t}`);
            if (btn) {
                btn.classList.toggle('active', t === activeTempo);
                btn.classList.toggle('btn-primary', t === activeTempo);
                btn.classList.toggle('btn-secondary', t !== activeTempo);
            }
        });
    }

    triggerSurprise(customSpeech = null) {
        const randomIndex = Math.floor(Math.random() * this.funActions.length);
        const chosen = this.funActions[randomIndex];
        this.executeAction(chosen.id);
        if (customSpeech) {
            this.speak(customSpeech);
        }
    }

    executeFunCommand(commandText) {
        if (!commandText || !commandText.trim()) return;
        const text = commandText.toLowerCase().trim();

        // 1. Check stop
        if (/stop|halt|freeze|quiet|pause|reset|calm down/.test(text)) {
            this.stopAll();
            return;
        }

        // 2. Check surprise
        if (/surprise me|random|do something|anything/.test(text) && !/laugh|joke/.test(text)) {
            this.triggerSurprise();
            return;
        }

        // 3. Match action verbs
        let matched = null;
        if (/dance fast|fast dance|faster/.test(text)) matched = 'dance_fast';
        else if (/random dance|freestyle/.test(text)) matched = 'random_dance';
        else if (/dance|groove|bust a move/.test(text)) matched = 'dance';
        else if (/wave|say hello|hello|hi\b|greetings/.test(text)) matched = 'wave';
        else if (/love|heart|hug|cuddle/.test(text)) {
            matched = /hug|cuddle/.test(text) ? 'hug' : 'love';
        }
        else if (/laugh|funny|joke|hilarious|make me laugh|crack a joke|cheer me up/.test(text)) matched = 'laugh';
        else if (/sleep|nap|bed|tired|goodnight/.test(text)) matched = 'sleep';
        else if (/surprise|shock|gasp|whoa/.test(text)) matched = 'surprise';
        else if (/cool|shades|sunglasses|pose|swag/.test(text)) matched = 'cool';
        else if (/celebrate|yay|hurray|cheer/.test(text)) matched = 'celebrate';
        else if (/clap|applause|applaud|bravo/.test(text)) matched = 'clap';
        else if (/jump|hop|bounce/.test(text)) matched = 'jump';
        else if (/spin|twirl|rotate|turn around/.test(text)) matched = 'spin';
        else if (/party|rave/.test(text)) matched = 'party';
        else if (/flex|muscle|workout|strong/.test(text)) matched = 'flex';
        else if (/cry|sad|tear|sob/.test(text)) matched = 'cry';
        else if (/angry|mad|grumpy|furious/.test(text)) matched = 'angry';
        else if (/cute|adorable|sweet/.test(text)) matched = 'cute';
        else if (/silly|goofy|bleh|face/.test(text)) matched = 'silly';
        else if (/sing|song|music|melody/.test(text)) matched = 'sing';

        if (matched) {
            this.executeAction(matched);
        } else {
            this.triggerSurprise(`You got it! Doing something fun for you!`);
        }
    }

    submitFunCommand() {
        const input = document.getElementById('signi-cmd-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        this.executeFunCommand(text);
    }

    toggleFunMic() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
        if (!SpeechRec) {
            showToast('Voice input is not supported in this browser. You can type commands!', 'info', 3000);
            return;
        }

        const micBtn = document.getElementById('signi-cmd-mic-btn');
        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
            if (micBtn) micBtn.classList.add('listening');
            showToast('Listening... Tell Signi what to do!', 'info', 2000);
        };

        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            const inputField = document.getElementById('signi-cmd-input');
            if (inputField) inputField.value = transcript;
            this.executeFunCommand(transcript);
        };

        rec.onerror = () => {
            if (micBtn) micBtn.classList.remove('listening');
            showToast("Couldn't hear clearly. Try typing!", 'info', 2000);
        };

        rec.onend = () => {
            if (micBtn) micBtn.classList.remove('listening');
        };

        try {
            rec.start();
        } catch (e) {}
    }

    // ==========================================================================
    // Conversational Intelligence & Chatbot Responses
    // ==========================================================================

    handleUserSubmit(text) {
        this.appendMessage('user', text);
        this.setState('thinking');

        setTimeout(() => {
            const response = this.computeResponse(text);
            this.appendMessage('bot', response.html, response.signItem);
            this.speak(response.spoken);
            if (response.action) {
                try { response.action(); } catch (e) {}
            }
        }, 450);
    }

    computeResponse(rawText) {
        const text = rawText.toLowerCase().trim();

        // 0. Play / Fun Mode request
        if (text.includes('play') || text.includes('fun mode') || text.includes('game') || text.includes('dance for me')) {
            return {
                html: `Let's play together! Opening <strong>Fun Mode</strong> now! 🎮 You can make me dance, wave, spin, or type commands!`,
                spoken: `Let's play together! Opening Fun Mode now!`,
                action: () => this.openFunMode()
            };
        }

        // 1. "Speak my message" / "Read my message aloud"
        if (text.includes('speak') && (text.includes('message') || text.includes('text') || text.includes('it') || text.includes('sentence'))) {
            if (window.workspace && window.workspace.getMessageText()) {
                const msg = window.workspace.getMessageText();
                return {
                    html: `I'm speaking your message: <em>"${msg}"</em> aloud right now!`,
                    spoken: `Speaking your message: ${msg}`,
                    action: () => window.workspace.speakMessage()
                };
            } else {
                return {
                    html: `You don't have any text in your message builder yet! Try showing a sign to the camera or tapping letters on the <a href="/sign" style="color:var(--brand-indigo);font-weight:700;">Sign Board</a> first.`,
                    spoken: `You don't have any text in your message yet. Try choosing a sign from the Sign Board first!`
                };
            }
        }

        // 2. "Clear my message"
        if (text.includes('clear') && (text.includes('message') || text.includes('text') || text.includes('all'))) {
            if (window.workspace) {
                return {
                    html: `I cleared your message box for you! Ready for your next signs.`,
                    spoken: `Message cleared! Ready for your next signs.`,
                    action: () => window.workspace.clearMessage()
                };
            }
        }

        // 3. "Show me [sign / word / letter]"
        const showMatch = text.match(/(?:show me|how do i sign|how to sign|how do you sign|what does|sign for)\s+([a-z0-9\s]+)/i);
        let targetWord = showMatch ? showMatch[1].trim() : '';
        if (!targetWord && text.length <= 3 && text.match(/^[a-z]$/i)) {
            targetWord = text;
        }

        if (targetWord && typeof SIGN_DATABASE !== 'undefined') {
            const found = SIGN_DATABASE.find(s =>
                s.label.toLowerCase() === targetWord ||
                s.name.toLowerCase() === targetWord ||
                s.id.toLowerCase() === targetWord
            );

            if (found) {
                return {
                    html: `
                        Here is the ASL sign for <strong>${found.label}</strong> (${found.name}):
                        <div class="signi-sign-demo-card">
                            <div class="demo-svg-wrap">
                                ${generateHandSignSvg(found.id)}
                            </div>
                            <strong>${found.label}</strong>
                            <span>${found.meaning}</span>
                            <button class="btn btn-sm btn-primary" style="margin-top:0.4rem;" onclick="window.location.href='/sign'">
                                Practice in Camera
                            </button>
                        </div>
                    `,
                    spoken: `This is the sign for ${found.label}. ${found.meaning}`,
                    signItem: found
                };
            }
        }

        // 4. "How do I use SignSpeak?" / "How does it work?"
        if (text.includes('how') && (text.includes('use') || text.includes('work') || text.includes('start'))) {
            return {
                html: `
                    SignSpeak is designed to be super easy! Here's the 3-step flow:
                    <ol style="margin-top: 0.5rem; padding-left: 1.25rem; font-size: 0.85rem; line-height: 1.6;">
                        <li><strong>Show your sign:</strong> Click <em>Start Camera</em> and position your hand in the frame.</li>
                        <li><strong>Build words:</strong> Hold your sign steady for ~1 second, or tap letters directly from the <em>Sign Board</em>.</li>
                        <li><strong>Turn to Voice:</strong> Press <strong>🔊 Speak Message</strong> to speak it out loud!</li>
                    </ol>
                `,
                spoken: `It's super easy! Show your sign to the camera, hold steady for one second to add it to your message, then press Speak Message to hear it aloud.`
            };
        }

        // 5. "Show me the alphabet" / "Sign library"
        if (text.includes('alphabet') || text.includes('library') || text.includes('letters')) {
            return {
                html: `
                    You can explore all 26 American Sign Language letters (A–Z) in our visual reference library!
                    <div style="margin-top: 0.5rem;">
                        <a href="/alphabet" class="btn btn-sm btn-primary">
                            <i class="fas fa-book-open"></i> Open Sign Alphabet
                        </a>
                    </div>
                `,
                spoken: `You can view the full American Sign Language alphabet from A to Z on our Sign Alphabet page.`
            };
        }

        // 6. Camera Tips
        if (text.includes('camera') || text.includes('recognize') || text.includes('lighting') || text.includes('detect')) {
            return {
                html: `
                    💡 <strong>Tips for best camera recognition:</strong>
                    <ul style="margin-top:0.4rem; padding-left:1.25rem; font-size:0.85rem; line-height:1.6;">
                        <li>Face your palm towards the camera inside the dashed frame.</li>
                        <li>Use clear lighting so your fingers are distinct from the background.</li>
                        <li>Hold your hand steady for about 1 second until the green stability bar completes!</li>
                    </ul>
                `,
                spoken: `For best results, keep your hand inside the frame with good lighting and hold the gesture steady for one second.`
            };
        }

        // 7. Emergency or Quick phrases
        if (text.includes('help') || text.includes('emergency') || text.includes('danger')) {
            return {
                html: `
                    🚨 For urgent communication, we have a one-tap <strong>Emergency Phrase</strong> button!
                    <div style="margin-top:0.5rem;">
                        <button class="btn btn-emergency btn-sm" onclick="if(window.handleEmergencyHelp){window.handleEmergencyHelp();}else{window.location.href='/sign';}">
                            <i class="fas fa-circle-exclamation"></i> Speak: "I NEED HELP"
                        </button>
                    </div>
                `,
                spoken: `If you need urgent assistance, tap the I Need Help button to immediately speak aloud!`
            };
        }

        // 8. General greetings
        if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('who are you')) {
            return {
                html: `Hello! I'm <strong>Signi</strong>, your friendly AI companion. I'm here to help bridge sign language and spoken words! Ask me to show any letter or phrase anytime.`,
                spoken: `Hello! I'm Signi, your AI companion. I'm here to help you learn signs and communicate effortlessly!`
            };
        }

        // 9. Compliments / Thank you
        if (text.includes('thank') || text.includes('awesome') || text.includes('great') || text.includes('good job')) {
            return {
                html: `You're very welcome! I love helping you communicate. Keep signing! 🌟`,
                spoken: `You're very welcome! I'm happy to help you communicate.`
            };
        }

        // Default Fallback
        return {
            html: `
                I understand! You can ask me things like:
                <ul style="margin-top:0.4rem; padding-left:1.25rem; font-size:0.85rem; line-height:1.6;">
                    <li><em>"Show me Thank You"</em></li>
                    <li><em>"Show me letter A"</em></li>
                    <li><em>"How do I use SignSpeak?"</em></li>
                    <li><em>"Speak my message"</em></li>
                    <li><em>"Play with Signi"</em></li>
                </ul>
            `,
            spoken: `I'm here to help! You can ask me to show you any sign, explain how camera recognition works, or play in Fun Mode.`
        };
    }

    appendMessage(sender, html, signItem = null) {
        const messagesContainer = document.getElementById('signi-chat-messages');
        if (!messagesContainer) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `signi-msg ${sender}`;

        if (sender === 'bot') {
            msgDiv.innerHTML = `
                <div class="signi-avatar-box" data-size="28" style="flex-shrink:0;">
                    ${this.generateSvg(28, 'talking')}
                </div>
                <div class="signi-msg-bubble">${html}</div>
            `;
        } else {
            msgDiv.innerHTML = `
                <div class="signi-msg-bubble">${this.escapeHtml(html)}</div>
            `;
        }

        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================================================
    // Contextual Page Avatars
    // ==========================================================================

    renderContextualAvatars() {
        document.querySelectorAll('.signi-avatar-box').forEach(box => {
            const size = parseInt(box.getAttribute('data-size') || '56');
            const state = box.getAttribute('data-state') || 'idle';
            box.innerHTML = this.generateSvg(size, state);
        });
    }

    initSuggestedEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isFunModalOpen) {
                    this.closeFunMode();
                } else if (this.isChatOpen) {
                    this.closeChat();
                }
            }
        });
    }

    // ==========================================================================
    // Live Workspace Reaction Bridge
    // ==========================================================================

    onCameraStateChanged(active) {
        const camCompanionText = document.getElementById('signi-cam-feedback-text');
        if (camCompanionText) {
            camCompanionText.textContent = active
                ? "Show me a sign! Keep your hand inside the frame."
                : "Camera is paused. Tap 'Start Camera' or use the Sign Board!";
        }
        if (active) {
            this.setState('happy', 1200);
        }
    }

    onHandDetected(detected) {
        const camCompanionText = document.getElementById('signi-cam-feedback-text');
        if (camCompanionText) {
            camCompanionText.textContent = detected
                ? "I can see your hand! Hold steady."
                : "Place your hand inside the frame.";
        }
        if (detected) {
            this.setState('helping', 600);
        }
    }

    onSignRecognized(sign) {
        const camCompanionText = document.getElementById('signi-cam-feedback-text');
        if (camCompanionText) {
            camCompanionText.textContent = `Nice! I recognized: ${sign}!`;
        }
        this.setState('happy', 1400);
    }

    onMessageSpoken(text) {
        const camCompanionText = document.getElementById('signi-cam-feedback-text');
        if (camCompanionText) {
            camCompanionText.textContent = `Speaking: "${text}"`;
        }
        this.setState('talking');
    }

    onWordCompleted() {
        this.setState('excited', 1500);
    }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    window.signi = new SigniCompanion();
});
