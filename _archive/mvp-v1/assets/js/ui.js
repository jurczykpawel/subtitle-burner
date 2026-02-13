import { state, refs } from './state.js';

export function showStatus(type, message) {
    if (!refs.status) return;
    refs.status.className = `status ${type}`;
    refs.status.innerHTML = message;
    refs.status.style.display = 'block';
}

export function updatePreview() {
    const bg = refs.bgColor.value;
    const opacity = refs.bgOpacity.value / 100;
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r},${g},${b}`;
    };

    const outlinePx = parseInt(refs.outlineWidth.value, 10);
    const shadowPx = parseInt(refs.shadowSize.value, 10);

    refs.subtitleOverlay.style.fontFamily = refs.fontFamily.value;
    refs.subtitleOverlay.style.fontSize = refs.fontSize.value + 'px';
    refs.subtitleOverlay.style.color = refs.fontColor.value;
    refs.subtitleOverlay.style.backgroundColor = `rgba(${hexToRgb(bg)}, ${opacity})`;
    refs.subtitleOverlay.style.bottom = (100 - refs.position.value) + '%';
    refs.subtitleOverlay.style.padding = '10px 20px';
    refs.subtitleOverlay.style.borderRadius = '8px';
    refs.subtitleOverlay.style.fontWeight = 'bold';
    refs.subtitleOverlay.style.textTransform = refs.uppercase.value === 'on' ? 'uppercase' : 'none';
    refs.subtitleOverlay.style.textShadow = shadowPx > 0 ? `0 0 ${shadowPx}px rgba(0,0,0,0.8)` : 'none';
    refs.subtitleOverlay.style.webkitTextStroke = outlinePx > 0 ? `${outlinePx}px #000000` : '0px transparent';
}

export function updateUiState() {
    const hasVideo = !!state.videoFile;
    const hasSrt = !!state.srtContent && state.srtContent.trim().length > 0;

    if (refs.quickActions) {
        if (hasVideo || hasSrt) {
            refs.quickActions.classList.remove('is-hidden');
        } else {
            refs.quickActions.classList.add('is-hidden');
        }
    }

    refs.requiresInputElements.forEach((el) => {
        if (hasVideo && hasSrt) {
            el.classList.remove('is-hidden');
        } else {
            el.classList.add('is-hidden');
        }
    });
}

export function checkReadyToRender() {
    if (!refs.renderBtn) return;
    refs.renderBtn.disabled = !(state.videoFile && state.srtContent);
}
