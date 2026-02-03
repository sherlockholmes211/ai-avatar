const { ipcRenderer: customizationIpc } = require('electron');

// ==========================================
// CUSTOMIZATION SYSTEM
// ==========================================



const themes = {
    pink: {
        primary: '#FFB7C5',
        secondary: '#FF8FAB',
        accent: '#FF6B8A',
        shadow: 'rgba(255, 107, 138, 0.4)'
    },
    blue: {
        primary: '#A2D2FF',
        secondary: '#BDE0FE',
        accent: '#219EBC',
        shadow: 'rgba(33, 158, 188, 0.4)'
    },
    purple: {
        primary: '#CDB4DB',
        secondary: '#AFADDE',
        accent: '#7400B8',
        shadow: 'rgba(116, 0, 184, 0.4)'
    },
    green: {
        primary: '#D8F3DC',
        secondary: '#95D5B2',
        accent: '#2D6A4F',
        shadow: 'rgba(45, 106, 79, 0.4)'
    },
    yellow: {
        primary: '#FDFFB6',
        secondary: '#FFD60A',
        accent: '#FFB703',
        shadow: 'rgba(255, 183, 3, 0.4)'
    }
};

// Apply saved preferences or defaults
function applyPreferences() {
    const saved = JSON.parse(localStorage.getItem('avatar-prefs') || '{}');
    if (saved.theme) setTheme(saved.theme, false);
    if (saved.face) setFace(saved.face, false);
    if (saved.size) setSize(saved.size, false);
}

function setTheme(themeName, shouldSave = true) {
    const theme = themes[themeName] || themes.pink;
    const root = document.documentElement;
    root.style.setProperty('--avatar-primary', theme.primary);
    root.style.setProperty('--avatar-secondary', theme.secondary);
    root.style.setProperty('--avatar-accent', theme.accent);
    root.style.setProperty('--avatar-shadow', theme.shadow);

    if (shouldSave) {
        savePreference('theme', themeName);
        if (typeof showSpeechBubble === 'function') {
            showSpeechBubble(`Theme changed to ${themeName}! ✨`, 'excited');
        }
    }
}

function setFace(face, shouldSave = true) {
    // Note: Expressions are currently static for the high-quality anime sprite
    // Future update: Support multiple asset frames for different expressions
    if (shouldSave) {
        savePreference('face', face);
        if (typeof showSpeechBubble === 'function') {
            showSpeechBubble(`I'm practicing that face! ${face}\n(Coming soon ✨)`, 'normal');
        }
    }
}

function setSize(size, shouldSave = true) {
    document.documentElement.style.setProperty('--avatar-size', size);
    if (shouldSave) {
        savePreference('size', size);
        if (typeof showSpeechBubble === 'function') {
            showSpeechBubble("How's this for size? 📏", 'normal');
        }
    }
}

function savePreference(key, value) {
    const prefs = JSON.parse(localStorage.getItem('avatar-prefs') || '{}');
    prefs[key] = value;
    localStorage.setItem('avatar-prefs', JSON.stringify(prefs));
}

// Right-click for customization menu
document.addEventListener('DOMContentLoaded', () => {
    const avContainer = document.getElementById('avatar-container');
    if (avContainer) {
        avContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            customizationIpc.send('show-avatar-menu');
        });
    }
});

// IPC Listeners for menu actions
customizationIpc.on('change-theme', (event, theme) => setTheme(theme));
customizationIpc.on('change-face', (event, face) => setFace(face));
customizationIpc.on('change-size', (event, size) => setSize(size));

// Export if using modules, but for now we rely on global scope in Electron
window.applyPreferences = applyPreferences;
window.setTheme = setTheme;
window.setFace = setFace;
window.setSize = setSize;
