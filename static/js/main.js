/**
 * SignSpeak AI — Core Frontend Utilities
 * Handles Themes, Toasts, Health Monitoring, and Micro-interactions.
 */

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('signspeak-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('signspeak-theme', newTheme);
            updateThemeIcon(newTheme);
            showToast(`Switched to ${newTheme} mode`, 'info');
        });
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Global Toast Notifications
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(60px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Animate Numeric Counters (e.g. 0 -> 1,248)
function animateValue(elem, start, end, duration = 1200, suffix = '') {
    if (!elem) return;
    const startTime = performance.now();
    const isFloat = end % 1 !== 0;

    function step(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);
        const currentVal = start + (end - start) * easeOutQuad;

        if (isFloat) {
            elem.textContent = currentVal.toFixed(1) + suffix;
        } else {
            elem.textContent = Math.floor(currentVal).toLocaleString() + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            if (isFloat) {
                elem.textContent = end.toFixed(1) + suffix;
            } else {
                elem.textContent = end.toLocaleString() + suffix;
            }
        }
    }
    requestAnimationFrame(step);
}

// Live AI Health Monitor
async function checkSystemHealth() {
    try {
        const res = await fetch('/api/health');
        const data = await res.json();
        const statusPill = document.getElementById('system-status-pill');
        const statusText = document.getElementById('system-status-text');

        if (statusPill && statusText) {
            if (data.model_loaded) {
                statusPill.style.background = 'rgba(16, 185, 129, 0.1)';
                statusPill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                statusPill.style.color = '#10b981';
                statusText.textContent = 'AI Model Online';
            } else {
                statusPill.style.background = 'rgba(245, 158, 11, 0.1)';
                statusPill.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                statusPill.style.color = '#f59e0b';
                statusText.textContent = 'Model Ready for Training';
            }
        }
    } catch (e) {
        console.warn('Health check unreachable:', e);
    }
}

// Mobile Navbar Drawer Toggle
function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = navLinks.style.display === 'flex';
            navLinks.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = 'var(--bg-surface)';
                navLinks.style.padding = '1.5rem';
                navLinks.style.borderBottom = '1px solid var(--border-card)';
            }
        });
    }
}

// Subtle Scroll Reveal via IntersectionObserver
function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal-on-scroll, .stagger-items').forEach(el => {
            el.classList.add('revealed');
        });
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal-on-scroll, .stagger-items').forEach(el => {
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    checkSystemHealth();
    initScrollReveal();
});
