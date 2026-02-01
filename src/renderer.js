const { ipcRenderer } = require('electron');

// Avatar state
const state = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    isMoving: false,
    isDragging: false,
    emotion: 'idle',
    speed: 3,
    direction: 'right'
};

// DOM Elements
const avatarContainer = document.getElementById('avatar-container');
const avatar = document.getElementById('avatar');
const speechBubble = document.getElementById('speech-bubble');
const bubbleText = document.getElementById('bubble-text');

// ==========================================
// SMART CLICK-THROUGH SYSTEM
// ==========================================
// By default, clicks pass through to desktop
// Only when mouse is over avatar or speech bubble, we capture clicks

function enableClickCapture() {
    ipcRenderer.send('set-ignore-mouse-events', false);
}

function enableClickThrough() {
    ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
}

// Track mouse over interactive elements
avatarContainer.addEventListener('mouseenter', () => {
    enableClickCapture();
});

avatarContainer.addEventListener('mouseleave', () => {
    if (!state.isDragging) {
        enableClickThrough();
    }
});

speechBubble.addEventListener('mouseenter', () => {
    enableClickCapture();
});

speechBubble.addEventListener('mouseleave', () => {
    enableClickThrough();
});

// Initialize avatar position
function initAvatar() {
    avatarContainer.style.left = `${state.x}px`;
    avatarContainer.style.top = `${state.y}px`;
    avatar.classList.add('idle');

    // Show welcome message after a short delay
    setTimeout(() => {
        showSpeechBubble("Hi! I'm your AI buddy! 🌟\nClick me to interact!", 'excited');
    }, 1000);
}

// Update avatar position
function updateAvatarPosition() {
    avatarContainer.style.left = `${state.x}px`;
    avatarContainer.style.top = `${state.y}px`;

    // Update speech bubble position
    updateSpeechBubblePosition();
}

// // Move avatar towards target
function moveTowardsTarget() {
    if (state.isDragging) return;

    const dx = state.targetX - state.x;
    const dy = state.targetY - state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        state.isMoving = true;
        avatar.classList.remove('idle');
        avatar.classList.add('walking');

        // Normalize and apply speed
        const vx = (dx / distance) * state.speed;
        const vy = (dy / distance) * state.speed;

        state.x += vx;
        state.y += vy;

        // Flip avatar based on direction
        if (vx > 0 && state.direction !== 'right') {
            state.direction = 'right';
            avatar.style.transform = 'scaleX(1)';
        } else if (vx < 0 && state.direction !== 'left') {
            state.direction = 'left';
            avatar.style.transform = 'scaleX(-1)';
        }

        updateAvatarPosition();
    } else {
        if (state.isMoving) {
            state.isMoving = false;
            avatar.classList.remove('walking');
            avatar.classList.add('idle');

            // Random message when arriving
            const messages = [
                "I made it! ✨",
                "Here I am! 😊",
                "What's up? 💫",
                "Did you call me? 🌸"
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            showSpeechBubble(randomMessage, 'normal');
        }
    }
}

// Show speech bubble
function showSpeechBubble(text, mood = 'normal', duration = 4000) {
    // Remove old classes
    speechBubble.classList.remove('hidden', 'thinking', 'excited');

    // Add mood class
    if (mood === 'thinking') {
        speechBubble.classList.add('thinking');
    } else if (mood === 'excited') {
        speechBubble.classList.add('excited');
    }

    // Typewriter effect
    typewriterEffect(text);

    updateSpeechBubblePosition();

    // Auto-hide after duration
    if (duration > 0) {
        setTimeout(() => {
            speechBubble.classList.add('hidden');
        }, duration);
    }
}

// Typewriter effect for speech bubble
function typewriterEffect(text) {
    let i = 0;
    bubbleText.textContent = '';

    function type() {
        if (i < text.length) {
            bubbleText.textContent += text.charAt(i);
            i++;
            setTimeout(type, 30);
        }
    }

    type();
}

// Update speech bubble position relative to avatar
function updateSpeechBubblePosition() {
    const bubbleWidth = speechBubble.offsetWidth || 200;
    const avatarWidth = avatarContainer.offsetWidth || 80;

    // Position above and centered on avatar
    let bubbleX = state.x + (avatarWidth / 2) - (bubbleWidth / 2);
    let bubbleY = state.y - speechBubble.offsetHeight - 20;

    // Keep within screen bounds
    bubbleX = Math.max(10, Math.min(window.innerWidth - bubbleWidth - 10, bubbleX));
    bubbleY = Math.max(10, bubbleY);

    speechBubble.style.left = `${bubbleX}px`;
    speechBubble.style.top = `${bubbleY}px`;
}

// Drag functionality
let dragOffsetX = 0;
let dragOffsetY = 0;

avatarContainer.addEventListener('mousedown', (e) => {
    state.isDragging = true;
    dragOffsetX = e.clientX - state.x;
    dragOffsetY = e.clientY - state.y;

    avatar.classList.remove('idle', 'walking');
    avatar.classList.add('excited');

    // Enable mouse events during drag
    enableClickCapture();
});

document.addEventListener('mousemove', (e) => {
    if (state.isDragging) {
        state.x = e.clientX - dragOffsetX;
        state.y = e.clientY - dragOffsetY;
        state.targetX = state.x;
        state.targetY = state.y;

        // Keep within bounds
        state.x = Math.max(0, Math.min(window.innerWidth - 80, state.x));
        state.y = Math.max(0, Math.min(window.innerHeight - 100, state.y));

        updateAvatarPosition();
    }
});

document.addEventListener('mouseup', () => {
    if (state.isDragging) {
        state.isDragging = false;
        avatar.classList.remove('excited');
        avatar.classList.add('idle');

        showSpeechBubble("Wheee! That was fun! 🎉", 'excited');
        createParticle(state.x + 40, state.y, '💫');
        createParticle(state.x + 50, state.y + 20, '⭐');
        createParticle(state.x + 30, state.y + 10, '✨');

        // Re-enable click-through after drag ends
        enableClickThrough();
    }
});

// Create particle effect
function createParticle(x, y, emoji) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = emoji;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    document.body.appendChild(particle);

    setTimeout(() => particle.remove(), 1000);
}

// Random idle behaviors
function randomIdleBehavior() {
    if (state.isMoving || state.isDragging) return;

    const behaviors = [
        () => {
            // Look around
            const thoughts = [
                "Hmm... 🤔",
                "What should I do? 💭",
                "I wonder... ✨",
                "Nice day! 🌈"
            ];
            showSpeechBubble(thoughts[Math.floor(Math.random() * thoughts.length)], 'thinking', 3000);
        },
        () => {
            // Small random move
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 100;
            state.targetX = Math.max(0, Math.min(window.innerWidth - 80, state.x + offsetX));
            state.targetY = Math.max(0, Math.min(window.innerHeight - 100, state.y + offsetY));
        },
        () => {
            // Just sparkle
            createParticle(state.x + 40, state.y, '✨');
        }
    ];

    const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    randomBehavior();
}

// Double-click for special interaction
avatarContainer.addEventListener('dblclick', () => {
    avatar.classList.remove('idle', 'walking');
    avatar.classList.add('excited');

    const greetings = [
        "You double-clicked me! 🎊",
        "Happy to see you! 💕",
        "Let's be friends! 🤝",
        "I love hanging out here! 🌟"
    ];

    showSpeechBubble(greetings[Math.floor(Math.random() * greetings.length)], 'excited', 4000);

    // Party particles
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const emojis = ['💖', '⭐', '🌟', '✨', '💫'];
            createParticle(
                state.x + 40 + (Math.random() - 0.5) * 60,
                state.y + (Math.random() - 0.5) * 40,
                emojis[i % emojis.length]
            );
        }, i * 100);
    }

    setTimeout(() => {
        avatar.classList.remove('excited');
        avatar.classList.add('idle');
    }, 2000);
});

// Animation loop
function gameLoop() {
    moveTowardsTarget();
    requestAnimationFrame(gameLoop);
}

// Start periodic idle behaviors
setInterval(randomIdleBehavior, 8000);

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
        showSpeechBubble(`Theme changed to ${themeName}! ✨`, 'excited');
    }
}

function setFace(face, shouldSave = true) {
    // We update the CSS content via the style property on a dummy element if needed, 
    // but here it's cleaner to just update a CSS variable if we had one for content,
    // or better, just target the ::after via a class or just change the property directly 
    // if it wasn't a pseudo-element. 
    // Since it IS a pseudo-element, we'll add a style tag to override it.
    let styleTag = document.getElementById('avatar-face-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'avatar-face-style';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `.avatar::after { content: '${face}'; }`;

    if (shouldSave) {
        savePreference('face', face);
        showSpeechBubble(`Do you like my new face? ${face}`, 'excited');
    }
}

function setSize(size, shouldSave = true) {
    document.documentElement.style.setProperty('--avatar-size', size);
    if (shouldSave) {
        savePreference('size', size);
        showSpeechBubble("How's this for size? 📏", 'normal');
    }
}

function savePreference(key, value) {
    const prefs = JSON.parse(localStorage.getItem('avatar-prefs') || '{}');
    prefs[key] = value;
    localStorage.setItem('avatar-prefs', JSON.stringify(prefs));
}

// Right-click for customization menu
avatarContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ipcRenderer.send('show-avatar-menu');
});

// IPC Listeners for menu actions
ipcRenderer.on('change-theme', (event, theme) => setTheme(theme));
ipcRenderer.on('change-face', (event, face) => setFace(face));
ipcRenderer.on('change-size', (event, size) => setSize(size));


// Initialize
initAvatar();
applyPreferences();
gameLoop();

// Handle window resize
window.addEventListener('resize', () => {
    // Keep avatar within new bounds
    state.x = Math.min(state.x, window.innerWidth - 80);
    state.y = Math.min(state.y, window.innerHeight - 100);
    state.targetX = state.x;
    state.targetY = state.y;
    updateAvatarPosition();
});

console.log('🌟 AI Avatar initialized!');
