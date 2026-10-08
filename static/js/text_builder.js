/**
 * SignSpeak AI — Real-Time Text Builder & Speech Synthesis Engine
 */

class TextBuilder {
    constructor() {
        this.accumulatorElem = document.getElementById('text-accumulator');
        this.fullSentenceElem = document.getElementById('full-sentence-output');
        
        // Buttons
        this.spaceBtn = document.getElementById('btn-builder-space');
        this.undoBtn = document.getElementById('btn-builder-undo');
        this.clearBtn = document.getElementById('btn-builder-clear');
        this.speakBtn = document.getElementById('btn-builder-speak');
        this.copyBtn = document.getElementById('btn-builder-copy');

        this.chars = [];
        this.synth = window.speechSynthesis;

        this.initEventListeners();
    }

    initEventListeners() {
        if (this.spaceBtn) this.spaceBtn.addEventListener('click', () => this.appendChar(' '));
        if (this.undoBtn) this.undoBtn.addEventListener('click', () => this.undo());
        if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clear());
        if (this.speakBtn) this.speakBtn.addEventListener('click', () => this.speak());
        if (this.copyBtn) this.copyBtn.addEventListener('click', () => this.copy());
    }

    appendChar(char) {
        if (char === 'del') {
            this.undo();
            return;
        }
        if (char === 'space') {
            char = ' ';
        }
        if (char === 'nothing') {
            return;
        }

        // Avoid repeated duplicate spaces
        if (char === ' ' && this.chars[this.chars.length - 1] === ' ') return;

        this.chars.push(char);
        this.render();
    }

    undo() {
        if (this.chars.length > 0) {
            this.chars.pop();
            this.render();
            showToast('Last character removed', 'info', 1500);
        }
    }

    clear() {
        if (this.chars.length > 0) {
            this.chars = [];
            this.render();
            showToast('Sentence cleared', 'info', 1500);
        }
    }

    getText() {
        return this.chars.join('');
    }

    render() {
        if (!this.accumulatorElem) return;

        if (this.chars.length === 0) {
            this.accumulatorElem.innerHTML = `<span style="color: var(--text-muted); font-size: 1rem; font-weight: normal;">Gestures will appear here...</span>`;
            if (this.fullSentenceElem) this.fullSentenceElem.textContent = 'Ready to translate';
            return;
        }

        this.accumulatorElem.innerHTML = this.chars.map(c => `
            <span class="accumulated-char">${c === ' ' ? '␣' : c}</span>
        `).join('');

        if (this.fullSentenceElem) {
            this.fullSentenceElem.textContent = this.getText();
        }
    }

    speak() {
        const text = this.getText().trim();
        if (!text) {
            showToast('No text to speak', 'error');
            return;
        }

        if (!this.synth) {
            showToast('Speech synthesis not supported in this browser', 'error');
            return;
        }

        // Cancel previous speech if active
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        
        // Select preferred English voice
        const voices = this.synth.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => showToast(`Speaking: "${text}"`, 'info', 2000);
        utterance.onerror = (e) => console.error('Speech synthesis error:', e);

        this.synth.speak(utterance);
    }

    copy() {
        const text = this.getText().trim();
        if (!text) {
            showToast('No text to copy', 'error');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.textBuilder = new TextBuilder();
});
