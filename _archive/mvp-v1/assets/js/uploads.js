import { state, refs } from './state.js';
import { checkReadyToRender, updateUiState } from './ui.js';
import { parseSRT, renderTimeline } from './timeline.js';

export function initUploads() {
    refs.videoUploadZone.addEventListener('click', () => refs.videoInput.click());
    refs.videoUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        refs.videoUploadZone.classList.add('active');
    });
    refs.videoUploadZone.addEventListener('dragleave', () => {
        refs.videoUploadZone.classList.remove('active');
    });
    refs.videoUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        refs.videoUploadZone.classList.remove('active');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            handleVideoUpload(file);
        }
    });

    refs.srtUploadZone.addEventListener('click', () => refs.srtInput.click());
    refs.srtUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        refs.srtUploadZone.classList.add('active');
    });
    refs.srtUploadZone.addEventListener('dragleave', () => {
        refs.srtUploadZone.classList.remove('active');
    });
    refs.srtUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        refs.srtUploadZone.classList.remove('active');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.srt')) {
            handleSrtUpload(file);
        }
    });

    refs.videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleVideoUpload(file);
        refs.videoInput.value = '';
    });

    refs.srtInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleSrtUpload(file);
        refs.srtInput.value = '';
    });

    refs.srtContentTextarea.addEventListener('input', (e) => {
        state.srtContent = e.target.value;
        parseSRT(state.srtContent);
        checkReadyToRender();
        renderTimeline();
        if (refs.srtControls && state.srtContent.trim().length > 0) {
            refs.srtControls.style.display = 'none';
        }
        updateUiState();
    });
}

export function initQuickActions() {
    refs.changeVideoBtn.addEventListener('click', () => {
        if (refs.videoControls) refs.videoControls.style.display = 'block';
        refs.videoInput.value = '';
        refs.videoInput.click();
    });

    refs.changeSrtBtn.addEventListener('click', () => {
        if (refs.srtControls) refs.srtControls.style.display = 'block';
        refs.srtInput.value = '';
        refs.srtInput.click();
    });

    refs.toggleSrtBtn.addEventListener('click', () => {
        if (!refs.srtControls) return;
        refs.srtControls.style.display = refs.srtControls.style.display === 'none' ? 'block' : 'none';
    });
}

export function handleVideoUpload(file) {
    state.videoFile = file;
    const url = URL.createObjectURL(file);
    refs.previewVideo.src = url;
    refs.videoInfo.textContent = `📁 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    refs.videoInfo.style.display = 'block';
    if (refs.videoControls) refs.videoControls.style.display = 'none';
    checkReadyToRender();
    updateUiState();

    refs.previewVideo.onloadedmetadata = () => {
        if (state.subtitles.length > 0) {
            renderTimeline();
        }
    };
}

export function handleSrtUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        state.srtContent = e.target.result;
        refs.srtContentTextarea.value = state.srtContent;
        parseSRT(state.srtContent);
        checkReadyToRender();
        renderTimeline();
        if (refs.srtControls) refs.srtControls.style.display = 'none';
        updateUiState();
    };
    reader.readAsText(file);
}
