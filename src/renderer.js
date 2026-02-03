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

// Update avatar position and frame
function updateAvatarPosition() {
    avatarContainer.style.left = `${state.x}px`;
    avatarContainer.style.top = `${state.y}px`;

    // Map state to sprite sheet frames (3x2 grid)
    // Row 0 (frameY = 0): [0:Standing/Walk, 1:Idle Sit, 2:Tea Sit]
    // Row 1 (frameY = 1): [0:Read+Cat, 1:Tea+Cat, 2:Read]
    let frameX = 0, frameY = 0;

    if (state.isDragging || state.emotion === 'excited') {
        frameX = 0; frameY = 0; // Standing for action
    } else if (state.isMoving) {
        frameX = 0; frameY = 0; // Walking pose
    } else {
        // Use the randomly selected idle frame
        // idleIndex 0-4 (mapping to the 5 sitting/reading poses)
        const idleIndex = state.idleIndex || 0;
        const frames = [
            { x: 1, y: 0 }, // Idle Sit
            { x: 2, y: 0 }, // Tea Sit
            { x: 0, y: 1 }, // Read + Cat
            { x: 1, y: 1 }, // Tea + Cat
            { x: 2, y: 1 }  // Read
        ];
        frameX = frames[idleIndex].x;
        frameY = frames[idleIndex].y;
    }

    avatar.style.setProperty('--frame-x', frameX);
    avatar.style.setProperty('--frame-y', frameY);

    // Flip avatar based on direction (only for walking/standing)
    if (state.isMoving || state.isDragging) {
        avatar.style.transform = state.direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
    } else {
        avatar.style.transform = 'scaleX(1)'; // Always face right when sitting/reading
    }

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
    const avatarWidth = avatarContainer.offsetWidth || 120;

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
        state.x = Math.max(0, Math.min(window.innerWidth - 200, state.x));
        state.y = Math.max(0, Math.min(window.innerHeight - 200, state.y));

        updateAvatarPosition();
    }
});

document.addEventListener('mouseup', () => {
    if (state.isDragging) {
        state.isDragging = false;
        avatar.classList.remove('excited');
        avatar.classList.add('idle');

        // Randomly pick an idle sitting pose after drag
        state.idleIndex = Math.floor(Math.random() * 5);

        showSpeechBubble("Wheee! That was fun! 🎉", 'excited');
        createParticle(state.x + 100, state.y + 50, '💫');
        createParticle(state.x + 120, state.y + 70, '⭐');
        createParticle(state.x + 80, state.y + 60, '✨');

        // Re-enable click-through after drag ends
        enableClickThrough();
        updateAvatarPosition();
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
            state.targetX = Math.max(0, Math.min(window.innerWidth - 200, state.x + offsetX));
            state.targetY = Math.max(0, Math.min(window.innerHeight - 200, state.y + offsetY));
        },
        () => {
            // Just sparkle
            createParticle(state.x + 100, state.y + 100, '✨');
        },
        () => {
            // Switch sitting/reading pose
            state.idleIndex = Math.floor(Math.random() * 5);
            updateAvatarPosition();
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
            const emojis = ['💖', '⭐', '🌟', '✨', '💫', '☕', '📖', '🐱'];
            createParticle(
                state.x + 100 + (Math.random() - 0.5) * 80,
                state.y + 80 + (Math.random() - 0.5) * 60,
                emojis[Math.floor(Math.random() * emojis.length)]
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

// Initialize
initAvatar();
if (window.applyPreferences) window.applyPreferences();
gameLoop();

// Handle window resize
window.addEventListener('resize', () => {
    // Keep avatar within new bounds
    state.x = Math.min(state.x, window.innerWidth - 200);
    state.y = Math.min(state.y, window.innerHeight - 200);
    state.targetX = state.x;
    state.targetY = state.y;
    updateAvatarPosition();
});

console.log('🌟 AI Avatar initialized!');
