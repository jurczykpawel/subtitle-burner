const { createFFmpeg, fetchFile } = FFmpeg;

let ffmpeg = null;
let videoFile = null;
let srtContent = '';
let subtitles = [];
let timelineZoom = 1; // pixels per second
let selectedSubtitle = null;
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
// Entry point moved to assets/js/main.js (module-based architecture).
    }

    try {
        const response = await fetch(`/api/projects/${id}`);
        if (!response.ok) throw new Error('Nie udało się pobrać projektu');
        const project = await response.json();
        applyProjectPayload(project);
        showStatus('success', '✅ Projekt wczytany');
    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd pobierania projektu');
    }
}

function exportProjectJson() {
    const project = buildProjectPayload();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importProjectJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const project = JSON.parse(e.target.result);
            applyProjectPayload(project);
            showStatus('success', '✅ Projekt zaimportowany');
        } catch (error) {
            console.error(error);
            showStatus('error', '❌ Nieprawidłowy plik JSON');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function updateUiState() {
    const hasVideo = !!videoFile;
    const hasSrt = !!srtContent && srtContent.trim().length > 0;

    if (quickActions) {
        if (hasVideo || hasSrt) {
            quickActions.classList.remove('is-hidden');
        } else {
            quickActions.classList.add('is-hidden');
        }
    }

    requiresInputElements.forEach((el) => {
        if (hasVideo && hasSrt) {
            el.classList.remove('is-hidden');
        } else {
            el.classList.add('is-hidden');
        }
    });
}

loadPresets();
renderPresetOptions();
updatePreview();
updateUiState();
