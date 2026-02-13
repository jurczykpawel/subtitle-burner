import { state, refs } from './state.js';
import { updatePreview, showStatus } from './ui.js';

const builtInPresets = {
    veed_clean: {
        name: 'Veed Clean',
        settings: {
            fontFamily: 'Arial',
            fontSize: 48,
            fontColor: '#FFFFFF',
            bgColor: '#000000',
            bgOpacity: 60,
            outlineWidth: 2,
            shadowSize: 2,
            uppercase: 'off',
            position: 85
        }
    },
    bold_hook: {
        name: 'Bold Hook',
        settings: {
            fontFamily: 'Impact',
            fontSize: 60,
            fontColor: '#FFFFFF',
            bgColor: '#000000',
            bgOpacity: 80,
            outlineWidth: 4,
            shadowSize: 3,
            uppercase: 'on',
            position: 85
        }
    },
    podcast_dark: {
        name: 'Podcast Dark',
        settings: {
            fontFamily: 'Helvetica',
            fontSize: 44,
            fontColor: '#F8FAFC',
            bgColor: '#0F172A',
            bgOpacity: 75,
            outlineWidth: 0,
            shadowSize: 4,
            uppercase: 'off',
            position: 85
        }
    },
    viral_punch: {
        name: 'Viral Punch',
        settings: {
            fontFamily: 'Impact',
            fontSize: 64,
            fontColor: '#FDE047',
            bgColor: '#000000',
            bgOpacity: 65,
            outlineWidth: 6,
            shadowSize: 2,
            uppercase: 'on',
            position: 85
        }
    }
};

export function initPresets() {
    refs.stylePreset.addEventListener('change', applyPresetFromSelection);
    refs.presetSaveBtn.addEventListener('click', savePreset);
    refs.presetUpdateBtn.addEventListener('click', updatePreset);
    refs.presetDeleteBtn.addEventListener('click', deletePreset);
    refs.presetRefreshBtn.addEventListener('click', loadPresets);
}

export function collectCurrentSettings() {
    return {
        fontFamily: refs.fontFamily.value,
        fontSize: Number(refs.fontSize.value),
        fontColor: refs.fontColor.value,
        bgColor: refs.bgColor.value,
        bgOpacity: Number(refs.bgOpacity.value),
        outlineWidth: Number(refs.outlineWidth.value),
        shadowSize: Number(refs.shadowSize.value),
        uppercase: refs.uppercase.value,
        position: Number(refs.position.value)
    };
}

export function applySettings(settings) {
    if (!settings) return;
    refs.fontFamily.value = settings.fontFamily ?? refs.fontFamily.value;
    refs.fontSize.value = settings.fontSize ?? refs.fontSize.value;
    refs.fontSizeValue.textContent = refs.fontSize.value;
    refs.fontColor.value = settings.fontColor ?? refs.fontColor.value;
    refs.fontColorText.value = refs.fontColor.value;
    refs.bgColor.value = settings.bgColor ?? refs.bgColor.value;
    refs.bgColorText.value = refs.bgColor.value;
    refs.bgOpacity.value = settings.bgOpacity ?? refs.bgOpacity.value;
    refs.bgOpacityValue.textContent = refs.bgOpacity.value;
    refs.outlineWidth.value = settings.outlineWidth ?? refs.outlineWidth.value;
    refs.outlineWidthValue.textContent = refs.outlineWidth.value;
    refs.shadowSize.value = settings.shadowSize ?? refs.shadowSize.value;
    refs.shadowSizeValue.textContent = refs.shadowSize.value;
    refs.uppercase.value = settings.uppercase ?? refs.uppercase.value;
    refs.position.value = settings.position ?? refs.position.value;
    refs.positionValue.textContent = refs.position.value;
    updatePreview();
}

export function applyPresetFromSelection() {
    const value = refs.stylePreset.value;
    if (!value || value === 'custom') return;

    if (value.startsWith('builtin:')) {
        const key = value.replace('builtin:', '');
        applySettings(builtInPresets[key]?.settings);
        return;
    }

    if (value.startsWith('user:')) {
        const id = value.replace('user:', '');
        const preset = state.userPresets.find(item => item.id === id);
        applySettings(preset?.settings);
    }
}

export function getSelectedPresetId() {
    const value = refs.stylePreset.value;
    if (value && value.startsWith('user:')) {
        return value.replace('user:', '');
    }
    return null;
}

export async function loadPresets() {
    try {
        const response = await fetch('/api/presets');
        if (!response.ok) throw new Error('Nie udało się pobrać presetów');
        state.userPresets = await response.json();
        renderPresetOptions();
    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd pobierania presetów');
    }
}

export function renderPresetOptions() {
    refs.stylePreset.innerHTML = '';

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom';
    refs.stylePreset.appendChild(customOption);

    const builtInGroup = document.createElement('optgroup');
    builtInGroup.label = 'Wbudowane';
    Object.entries(builtInPresets).forEach(([key, preset]) => {
        const option = document.createElement('option');
        option.value = `builtin:${key}`;
        option.textContent = preset.name;
        builtInGroup.appendChild(option);
    });
    refs.stylePreset.appendChild(builtInGroup);

    const userGroup = document.createElement('optgroup');
    userGroup.label = 'Twoje presety';
    state.userPresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = `user:${preset.id}`;
        option.textContent = preset.name;
        userGroup.appendChild(option);
    });
    refs.stylePreset.appendChild(userGroup);

    renderPresetList();
}

function renderPresetList() {
    if (!refs.presetList) return;
    refs.presetList.innerHTML = '';

    state.userPresets.forEach(preset => {
        const item = document.createElement('div');
        item.className = 'preset-item';

        const name = document.createElement('div');
        name.className = 'preset-item-name';
        name.textContent = preset.name;

        const actions = document.createElement('div');
        actions.className = 'preset-item-actions';

        const useBtn = document.createElement('button');
        useBtn.textContent = 'Użyj';
        useBtn.addEventListener('click', () => {
            refs.stylePreset.value = `user:${preset.id}`;
            applyPresetFromSelection();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Usuń';
        deleteBtn.addEventListener('click', () => {
            refs.stylePreset.value = `user:${preset.id}`;
            deletePreset();
        });

        actions.appendChild(useBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(name);
        item.appendChild(actions);
        refs.presetList.appendChild(item);
    });
}

async function savePreset() {
    const name = refs.presetName.value.trim();
    if (!name) {
        showStatus('error', '❌ Podaj nazwę presetu');
        return;
    }

    try {
        const response = await fetch('/api/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, settings: collectCurrentSettings() })
        });

        if (!response.ok) throw new Error('Nie udało się zapisać presetu');
        refs.presetName.value = '';
        await loadPresets();
        showStatus('success', '✅ Preset zapisany');
    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd zapisu presetu');
    }
}

async function updatePreset() {
    const value = refs.stylePreset.value;
    if (!value.startsWith('user:')) {
        showStatus('error', '❌ Wybierz preset użytkownika do aktualizacji');
        return;
    }

    const id = value.replace('user:', '');
    try {
        const response = await fetch(`/api/presets/${id}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: refs.presetName.value.trim() || undefined,
                    settings: collectCurrentSettings()
                })
            }
        );

        if (!response.ok) throw new Error('Nie udało się zaktualizować presetu');
        refs.presetName.value = '';
        await loadPresets();
        showStatus('success', '✅ Preset zaktualizowany');
    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd aktualizacji presetu');
    }
}

async function deletePreset() {
    const value = refs.stylePreset.value;
    if (!value.startsWith('user:')) {
        showStatus('error', '❌ Wybierz preset użytkownika do usunięcia');
        return;
    }

    const id = value.replace('user:', '');
    if (!confirm('Usunąć wybrany preset?')) return;

    try {
        const response = await fetch(`/api/presets/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Nie udało się usunąć presetu');
        await loadPresets();
        showStatus('success', '✅ Preset usunięty');
    } catch (error) {
        console.error(error);
        showStatus('error', '❌ Błąd usuwania presetu');
    }
}
