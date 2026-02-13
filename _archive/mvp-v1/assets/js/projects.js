import { state, refs } from './state.js';
import { showStatus, updateUiState, checkReadyToRender } from './ui.js';
import { applySettings, collectCurrentSettings } from './presets.js';
import { parseSRT, updateSRTContent, renderTimeline } from './timeline.js';

export function initProjects() {
    refs.projectSaveBtn.addEventListener('click', saveProjectToApi);
    refs.projectLoadBtn.addEventListener('click', loadProjectFromApi);
    refs.projectExportBtn.addEventListener('click', exportProjectJson);
    refs.projectImportBtn.addEventListener('click', () => refs.projectImportInput.click());
    refs.projectImportInput.addEventListener('change', importProjectJson);
}

export function buildProjectPayload() {
    return {
        name: refs.projectName.value.trim() || 'Untitled Project',
        srtContent: refs.srtContentTextarea.value,
        subtitles: state.subtitles,
        settings: collectCurrentSettings()
    };
}

export function applyProjectPayload(project) {
    if (!project) return;
    if (project.srtContent) {
        state.srtContent = project.srtContent;
        refs.srtContentTextarea.value = project.srtContent;
        parseSRT(project.srtContent);
    } else if (Array.isArray(project.subtitles)) {
        state.subtitles = project.subtitles;
        updateSRTContent();
    }

    if (project.settings) {
        applySettings(project.settings);
    }

    if (project.name) {
        refs.projectName.value = project.name;
    }

    checkReadyToRender();
    renderTimeline();
    updateUiState();
}

async function saveProjectToApi() {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildProjectPayload())
        });

        if (!response.ok) throw new Error('Nie udało się zapisać projektu');
        const project = await response.json();
        refs.projectIdInput.value = project.id;
        showStatus('success', `✅ Projekt zapisany. ID: ${project.id}`);
    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd zapisu projektu');
    }
}

async function loadProjectFromApi() {
    const id = refs.projectIdInput.value.trim();
    if (!id) {
        showStatus('error', '❌ Podaj ID projektu');
        return;
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
