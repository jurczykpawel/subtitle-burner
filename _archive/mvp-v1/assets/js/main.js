import { refs } from './state.js';
import { initTimeline } from './timeline.js';
import { initUploads, initQuickActions } from './uploads.js';
import { initPresets, loadPresets, renderPresetOptions } from './presets.js';
import { initProjects } from './projects.js';
import { runLocalRender } from './ffmpeg.js';
import { runServerRender } from './serverRender.js';
import { updatePreview, updateUiState, showStatus } from './ui.js';

initTimeline();
initUploads();
initQuickActions();
initPresets();
initProjects();
refs.renderBtn.addEventListener('click', async () => {
    const mode = refs.renderMode.value;
    if (mode === 'server') {
        const result = await runServerRender();
        if (result?.fallback) {
            await runLocalRender();
        }
    } else {
        await runLocalRender();
    }
});

refs.fontSize.addEventListener('input', (e) => {
    refs.fontSizeValue.textContent = e.target.value;
    updatePreview();
});

refs.fontFamily.addEventListener('change', updatePreview);
refs.fontColor.addEventListener('input', (e) => {
    refs.fontColorText.value = e.target.value;
    updatePreview();
});

refs.bgColor.addEventListener('input', (e) => {
    refs.bgColorText.value = e.target.value;
    updatePreview();
});

refs.bgOpacity.addEventListener('input', (e) => {
    refs.bgOpacityValue.textContent = e.target.value;
    updatePreview();
});

refs.position.addEventListener('input', (e) => {
    refs.positionValue.textContent = e.target.value;
    updatePreview();
});

refs.outlineWidth.addEventListener('input', (e) => {
    refs.outlineWidthValue.textContent = e.target.value;
    updatePreview();
});

refs.shadowSize.addEventListener('input', (e) => {
    refs.shadowSizeValue.textContent = e.target.value;
    updatePreview();
});

refs.uppercase.addEventListener('change', updatePreview);

const savedMode = localStorage.getItem('renderMode');
if (savedMode && refs.renderMode) {
    refs.renderMode.value = savedMode;
}
refs.renderMode.addEventListener('change', (e) => {
    localStorage.setItem('renderMode', e.target.value);
});

const savedApiKey = localStorage.getItem('apiKey');
if (savedApiKey && refs.apiKeyInput) {
    refs.apiKeyInput.value = savedApiKey;
}
refs.apiKeyInput.addEventListener('input', (e) => {
    localStorage.setItem('apiKey', e.target.value);
    loadQuotaInfo();
});

async function loadQuotaInfo() {
    if (!refs.quotaInfo || !refs.apiKeyInput) return;
    const apiKey = refs.apiKeyInput.value.trim();
    if (!apiKey) {
        refs.quotaInfo.textContent = 'Podaj API key, aby sprawdzić limit.';
        return;
    }
    try {
        const response = await fetch('/api/users/me', {
            headers: { 'x-api-key': apiKey }
        });
        if (!response.ok) {
            refs.quotaInfo.textContent = 'Nie udało się pobrać limitu.';
            return;
        }
        const data = await response.json();
        const remaining = Math.max(0, data.quota.limit - data.quota.used);
        refs.quotaInfo.textContent = `Pozostało ${remaining} renderów. Reset: ${new Date(data.quota.resetAt).toLocaleDateString()}`;
    } catch (error) {
        refs.quotaInfo.textContent = 'Błąd połączenia z API.';
    }
}

loadQuotaInfo();

loadPresets();
renderPresetOptions();
updatePreview();
updateUiState();
