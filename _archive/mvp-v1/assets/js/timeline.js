import { state, refs } from './state.js';
import { updatePreview } from './ui.js';

export function initTimeline() {
    if (refs.zoomInBtn) {
        refs.zoomInBtn.addEventListener('click', () => {
            state.timelineZoom = Math.min(200, state.timelineZoom * 1.5);
            state.isManualZoom = true;
            renderTimeline();
        });
    }

    if (refs.zoomOutBtn) {
        refs.zoomOutBtn.addEventListener('click', () => {
            state.timelineZoom = Math.max(20, state.timelineZoom / 1.5);
            state.isManualZoom = true;
            renderTimeline();
        });
    }

    if (refs.addSubtitleBtn) {
        refs.addSubtitleBtn.addEventListener('click', addNewSubtitle);
    }

    if (refs.editorSaveBtn) {
        refs.editorSaveBtn.addEventListener('click', saveEditorChanges);
    }
    if (refs.editorCancelBtn) {
        refs.editorCancelBtn.addEventListener('click', refreshEditorFields);
    }
    if (refs.editorDeleteBtn) {
        refs.editorDeleteBtn.addEventListener('click', () => {
            if (state.selectedSubtitle !== null) {
                deleteSubtitle(state.selectedSubtitle);
            }
        });
    }

    refs.previewVideo.addEventListener('timeupdate', () => {
        if (refs.previewVideo.duration && refs.playhead) {
            const left = refs.previewVideo.currentTime * state.timelineZoom;
            refs.playhead.style.left = left + 'px';
            if (refs.timelineTime) {
                refs.timelineTime.textContent = formatTime(refs.previewVideo.currentTime);
            }

            if (refs.timelineScroll) {
                const viewLeft = refs.timelineScroll.scrollLeft;
                const viewRight = viewLeft + refs.timelineScroll.clientWidth;
                if (left < viewLeft + 40 || left > viewRight - 40) {
                    refs.timelineScroll.scrollLeft = Math.max(0, left - refs.timelineScroll.clientWidth * 0.3);
                }
            }

            if (refs.timelineTrack) {
                const blocks = refs.timelineTrack.querySelectorAll('.subtitle-block');
                blocks.forEach((block, index) => {
                    const sub = state.subtitles[index];
                    if (refs.previewVideo.currentTime >= sub.start && refs.previewVideo.currentTime <= sub.end) {
                        block.classList.add('selected');
                    } else {
                        block.classList.remove('selected');
                    }
                });
            }
        }
    });

    refs.previewVideo.addEventListener('timeupdate', () => {
        const currentTime = refs.previewVideo.currentTime;
        const currentSub = state.subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);

        if (currentSub) {
            refs.subtitleOverlay.textContent = refs.uppercase.value === 'on' ? currentSub.text.toUpperCase() : currentSub.text;
            refs.subtitleOverlay.style.display = 'block';
            updatePreview();
        } else {
            refs.subtitleOverlay.style.display = 'none';
        }
    });

    if (refs.timelineRuler) {
        refs.timelineRuler.addEventListener('click', (e) => {
            const rect = refs.timelineRuler.getBoundingClientRect();
            const scrollLeft = refs.timelineScroll ? refs.timelineScroll.scrollLeft : 0;
            const x = e.clientX - rect.left + scrollLeft;
            const time = x / state.timelineZoom;
            refs.previewVideo.currentTime = Math.min(time, refs.previewVideo.duration);
        });
    }

    if (refs.timelineTrack) {
        refs.timelineTrack.addEventListener('click', (e) => {
            if (e.target === refs.timelineTrack) {
                const rect = refs.timelineTrack.getBoundingClientRect();
                const scrollLeft = refs.timelineScroll ? refs.timelineScroll.scrollLeft : 0;
                const x = e.clientX - rect.left + scrollLeft;
                const time = x / state.timelineZoom;
                refs.previewVideo.currentTime = Math.min(time, refs.previewVideo.duration);
            }
        });
    }
}

export function renderTimeline() {
    if (!refs.previewVideo.duration || state.subtitles.length === 0) {
        if (refs.timelineContainer) refs.timelineContainer.style.display = 'none';
        if (refs.subtitleEditor) refs.subtitleEditor.style.display = 'none';
        return;
    }

    if (refs.timelineContainer) refs.timelineContainer.style.display = 'block';
    if (refs.subtitleEditor) refs.subtitleEditor.style.display = 'block';

    const duration = refs.previewVideo.duration;
    const viewportWidth = refs.timelineScroll?.clientWidth || 600;
    if (!state.isManualZoom) {
        state.timelineZoom = Math.max(50, viewportWidth / duration);
    }
    const contentWidth = Math.max(viewportWidth, Math.ceil(duration * state.timelineZoom));
    refs.timelineRuler.style.width = contentWidth + 'px';
    refs.timelineTrack.style.width = contentWidth + 'px';

    renderRuler(duration);

    const existingBlocks = refs.timelineTrack.querySelectorAll('.subtitle-block');
    existingBlocks.forEach(block => block.remove());

    state.subtitles.forEach((sub, index) => {
        const block = createSubtitleBlock(sub, index);
        refs.timelineTrack.appendChild(block);
    });

    renderSubtitleList();
}

export function parseSRT(content) {
    state.subtitles = [];
    const blocks = content.trim().split(/\n\s*\n/);

    blocks.forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const timeLine = lines[1];
            const match = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
            if (match) {
                const text = lines.slice(2).join('\n');
                state.subtitles.push({
                    start: timeToSeconds(match[1]),
                    end: timeToSeconds(match[2]),
                    text: text
                });
            }
        }
    });
}

export function updateSRTContent() {
    state.subtitles.sort((a, b) => a.start - b.start);

    let srt = '';
    state.subtitles.forEach((sub, index) => {
        srt += `${index + 1}\n`;
        srt += `${formatSRTTime(sub.start)} --> ${formatSRTTime(sub.end)}\n`;
        srt += `${sub.text}\n\n`;
    });

    state.srtContent = srt.trim();
    refs.srtContentTextarea.value = state.srtContent;
    renderSubtitleList();
}

export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderRuler(duration) {
    refs.timelineRuler.innerHTML = '';
    const interval = state.timelineZoom > 100 ? 1 : state.timelineZoom > 50 ? 5 : 10;

    for (let i = 0; i <= duration; i += interval) {
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        marker.style.left = (i * state.timelineZoom) + 'px';
        marker.textContent = formatTime(i);
        refs.timelineRuler.appendChild(marker);
    }
}

function createSubtitleBlock(subtitle, index) {
    const block = document.createElement('div');
    block.className = 'subtitle-block';
    block.dataset.index = index;

    const left = subtitle.start * state.timelineZoom;
    const width = (subtitle.end - subtitle.start) * state.timelineZoom;

    block.style.left = left + 'px';
    block.style.width = Math.max(50, width) + 'px';
    block.style.top = '10px';

    const textSpan = document.createElement('span');
    textSpan.className = 'subtitle-block-text';
    textSpan.textContent = subtitle.text.substring(0, 30) + (subtitle.text.length > 30 ? '...' : '');
    block.appendChild(textSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'subtitle-block-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteSubtitle(index);
    };
    block.appendChild(deleteBtn);

    const leftHandle = document.createElement('div');
    leftHandle.className = 'subtitle-handle left';
    leftHandle.dataset.handle = 'left';
    block.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'subtitle-handle right';
    rightHandle.dataset.handle = 'right';
    block.appendChild(rightHandle);

    block.addEventListener('click', () => selectSubtitle(index));

    block.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('subtitle-handle')) {
            startResize(e, index, e.target.dataset.handle);
        } else if (e.target === block || e.target === textSpan) {
            startDrag(e, index);
        }
    });

    return block;
}

function startDrag(e, index) {
    if (e.target.classList.contains('subtitle-block-delete')) return;

    state.isDragging = true;
    state.selectedSubtitle = index;
    state.dragStartX = e.clientX;
    state.dragStartTime = state.subtitles[index].start;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
    if (!state.isDragging) return;

    const deltaX = e.clientX - state.dragStartX;
    const deltaTime = deltaX / state.timelineZoom;
    const newStart = Math.max(0, state.dragStartTime + deltaTime);
    const duration = state.subtitles[state.selectedSubtitle].end - state.subtitles[state.selectedSubtitle].start;

    state.subtitles[state.selectedSubtitle].start = newStart;
    state.subtitles[state.selectedSubtitle].end = newStart + duration;

    renderTimeline();
}

function stopDrag() {
    state.isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    updateSRTContent();
}

function startResize(e, index, handle) {
    e.stopPropagation();
    state.isResizing = true;
    state.selectedSubtitle = index;
    state.resizeHandle = handle;
    state.dragStartX = e.clientX;
    state.dragStartTime = handle === 'left' ? state.subtitles[index].start : state.subtitles[index].end;

    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
}

function onResize(e) {
    if (!state.isResizing) return;

    const deltaX = e.clientX - state.dragStartX;
    const deltaTime = deltaX / state.timelineZoom;

    if (state.resizeHandle === 'left') {
        const newStart = Math.max(0, Math.min(state.dragStartTime + deltaTime, state.subtitles[state.selectedSubtitle].end - 0.1));
        state.subtitles[state.selectedSubtitle].start = newStart;
    } else {
        const newEnd = Math.max(state.subtitles[state.selectedSubtitle].start + 0.1, state.dragStartTime + deltaTime);
        state.subtitles[state.selectedSubtitle].end = newEnd;
    }

    renderTimeline();
}

function stopResize() {
    state.isResizing = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
    updateSRTContent();
}

function deleteSubtitle(index) {
    if (confirm('Usunąć ten napis?')) {
        state.subtitles.splice(index, 1);
        if (state.selectedSubtitle === index) {
            state.selectedSubtitle = null;
        }
        renderTimeline();
        updateSRTContent();
    }
}

function selectSubtitle(index) {
    state.selectedSubtitle = index;
    const blocks = refs.timelineTrack.querySelectorAll('.subtitle-block');
    blocks.forEach((block, idx) => {
        if (idx === index) {
            block.classList.add('selected');
        } else {
            block.classList.remove('selected');
        }
    });
    refreshEditorFields();
    renderSubtitleList();
}

function refreshEditorFields() {
    if (state.selectedSubtitle === null || !refs.editorText) return;
    const sub = state.subtitles[state.selectedSubtitle];
    if (!sub) return;
    refs.editorText.value = sub.text;
    refs.editorStart.value = sub.start.toFixed(2);
    refs.editorEnd.value = sub.end.toFixed(2);
}

function saveEditorChanges() {
    if (state.selectedSubtitle === null) return;
    const sub = state.subtitles[state.selectedSubtitle];
    if (!sub) return;
    sub.text = refs.editorText.value;
    sub.start = parseFloat(refs.editorStart.value);
    sub.end = parseFloat(refs.editorEnd.value);
    renderTimeline();
    updateSRTContent();
}

function renderSubtitleList() {
    if (!refs.subtitleList) return;
    refs.subtitleList.innerHTML = '';
    state.subtitles.forEach((sub, index) => {
        const item = document.createElement('div');
        item.className = 'subtitle-item' + (state.selectedSubtitle === index ? ' active' : '');
        item.addEventListener('click', () => selectSubtitle(index));

        const time = document.createElement('div');
        time.className = 'subtitle-item-time';
        time.textContent = `${formatTime(sub.start)} → ${formatTime(sub.end)}`;

        const text = document.createElement('div');
        text.className = 'subtitle-item-text';
        text.textContent = sub.text.replace(/\n/g, ' ');

        const actions = document.createElement('div');
        actions.className = 'subtitle-item-actions';

        const jumpBtn = document.createElement('button');
        jumpBtn.textContent = '↘';
        jumpBtn.title = 'Przejdź do napisu';
        jumpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            refs.previewVideo.currentTime = sub.start;
            selectSubtitle(index);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑';
        deleteBtn.title = 'Usuń napis';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSubtitle(index);
        });

        actions.appendChild(jumpBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(time);
        item.appendChild(text);
        item.appendChild(actions);
        refs.subtitleList.appendChild(item);
    });
}

function addNewSubtitle() {
    const currentTime = refs.previewVideo.currentTime || 0;
    const newSub = {
        start: currentTime,
        end: currentTime + 3,
        text: 'Nowy napis'
    };

    state.subtitles.push(newSub);
    renderTimeline();
    updateSRTContent();
    selectSubtitle(state.subtitles.length - 1);
}

function formatSRTTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function timeToSeconds(timeStr) {
    const parts = timeStr.replace(',', ':').split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    const ms = parseInt(parts[3]);
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}
