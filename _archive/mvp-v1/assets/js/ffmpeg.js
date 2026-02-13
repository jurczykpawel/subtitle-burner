import { state, refs } from './state.js';
import { showStatus } from './ui.js';
import { formatTime } from './timeline.js';

const { createFFmpeg, fetchFile } = FFmpeg;

export async function runLocalRender() {
    if (!state.videoFile || !state.srtContent) return;

    showStatus('info', '🔄 Ładowanie FFmpeg...');
    refs.renderBtn.disabled = true;
    refs.progressBar.style.display = 'block';

    try {
        if (!state.ffmpeg) {
            state.ffmpeg = createFFmpeg({
                log: true,
                progress: ({ ratio }) => {
                    const percent = Math.round(ratio * 100);
                    refs.progressFill.style.width = percent + '%';
                    if (percent > 0) {
                        showStatus('info', `<span class="spinner"></span>Renderowanie: ${percent}%`);
                    }
                }
            });

            await state.ffmpeg.load();
        }

        showStatus('info', '<span class="spinner"></span>Przygotowywanie plików...');

        state.ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(state.videoFile));

        const assContent = createASSFile();
        state.ffmpeg.FS('writeFile', 'subtitles.ass', new TextEncoder().encode(assContent));

        showStatus('info', '<span class="spinner"></span>Renderowanie video (to może potrwać kilka minut)...');

        await state.ffmpeg.run(
            '-i', 'input.mp4',
            '-vf', 'ass=subtitles.ass',
            '-c:a', 'copy',
            '-preset', 'fast',
            'output.mp4'
        );

        showStatus('success', '✅ Renderowanie zakończone! Pobieranie...');

        const data = state.ffmpeg.FS('readFile', 'output.mp4');

        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video_z_napisami.mp4';
        a.click();

        showStatus('success', '🎉 Gotowe! Video zostało pobrane.');
        refs.progressBar.style.display = 'none';

    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd: ' + error.message);
        refs.progressBar.style.display = 'none';
    } finally {
        refs.renderBtn.disabled = false;
    }
}

function createASSFile() {
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `&H00${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}`;
    };

    const textColor = hexToRgb(refs.fontColor.value);
    const backgroundColor = hexToRgb(refs.bgColor.value);
    const bgAlpha = Math.round((1 - refs.bgOpacity.value / 100) * 255).toString(16).padStart(2, '0');
    const outlinePx = parseInt(refs.outlineWidth.value, 10);
    const shadowPx = parseInt(refs.shadowSize.value, 10);
    const upper = refs.uppercase.value === 'on';

    const alignment = 2;
    const marginV = Math.round((100 - refs.position.value) * 4);

    let ass = `[Script Info]
Title: Subtitle Burner
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${refs.fontFamily.value},${refs.fontSize.value},${textColor},${textColor},&H00000000,${backgroundColor}${bgAlpha},-1,0,0,0,100,100,0,0,3,${outlinePx},${shadowPx},${alignment},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    state.subtitles.forEach(sub => {
        const start = formatASSTime(sub.start);
        const end = formatASSTime(sub.end);
        const text = upper ? sub.text.toUpperCase() : sub.text;
        ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    });

    return ass;
}

function formatASSTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}
