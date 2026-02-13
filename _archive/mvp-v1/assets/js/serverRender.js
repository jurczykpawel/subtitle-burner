import { state, refs } from './state.js';
import { showStatus } from './ui.js';
import { getSelectedPresetId, collectCurrentSettings } from './presets.js';

async function pollJob(jobId, apiKey) {
    const headers = apiKey ? { 'x-api-key': apiKey } : {};

    while (true) {
        const response = await fetch(`/api/jobs/${jobId}`, { headers });
        if (!response.ok) {
            throw new Error('Nie udało się sprawdzić statusu renderu');
        }
        const data = await response.json();
        if (data.status === 'completed') {
            return data;
        }
        if (data.status === 'failed') {
            throw new Error(data.error || 'Render nieudany');
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

export async function runServerRender() {
    if (!state.videoFile || !state.srtContent) return;

    const apiKey = refs.apiKeyInput.value.trim();

    const formData = new FormData();
    formData.append('video', state.videoFile);
    formData.append('srt', state.srtContent);
    formData.append('settings', JSON.stringify(collectCurrentSettings()));

    const presetId = getSelectedPresetId();
    if (presetId) {
        formData.append('presetId', presetId);
    }

    showStatus('info', '☁️ Wysyłanie do renderu serwerowego...');
    refs.renderBtn.disabled = true;

    try {
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: apiKey ? { 'x-api-key': apiKey } : {},
            body: formData
        });

        if (response.status === 429) {
            const payload = await response.json().catch(() => ({}));
            if (payload.error === 'LIMIT_EXCEEDED') {
                showStatus('error', '⚠️ Limit renderów na serwerze wyczerpany. Przełączam na render lokalny.');
                refs.renderMode.value = 'local';
                localStorage.setItem('renderMode', 'local');
                refs.renderBtn.disabled = false;
                return { fallback: true };
            }
        }

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.error || 'Błąd renderu serwerowego');
        }

        const { id } = await response.json();
        showStatus('info', '⏳ Render w toku...');
        await pollJob(id, apiKey);

        const downloadResponse = await fetch(`/api/jobs/${id}/download`, {
            headers: apiKey ? { 'x-api-key': apiKey } : {}
        });
        if (!downloadResponse.ok) {
            throw new Error('Nie udało się pobrać pliku');
        }

        const blob = await downloadResponse.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video_z_napisami.mp4';
        a.click();

        showStatus('success', '🎉 Render serwerowy zakończony. Video pobrane.');
    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd: ' + error.message);
    } finally {
        refs.renderBtn.disabled = false;
    }
}
