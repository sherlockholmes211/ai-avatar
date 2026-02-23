const { ipcRenderer } = require('electron');

// --- CONFIGURATION ---
const CONFIG = {
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '', // Please set this env var
    ENABLE_TTS: false, // Disabled by default as requested
    VOICE_ID: 'pNInz6obpg8ndclQU7Nc', // Default: George
    SCRIBE_LANGUAGE: 'en'
};

const state = {
    x: window.innerWidth - 120,
    y: 120,
    emotion: 'idle'
};

// DOM Elements
const gameContainer = document.getElementById('game-container');
const interactionContainer = document.getElementById('interaction-container');
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
interactionContainer.addEventListener('mouseenter', () => {
    enableClickCapture();
});

interactionContainer.addEventListener('mouseleave', () => {
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
    updateAvatarPosition(); // Set initial position

    // Show welcome message after a short delay
    setTimeout(() => {
        showSpeechBubble("Hi! I'm your AI buddy! 🌟\nClick me to interact!", 'excited');
    }, 1000);
}

// Update speech bubble position
function updateAvatarPosition() {
    // Force avatar to top right
    state.x = window.innerWidth - 120;
    state.y = 120;

    if (isoChar) {
        isoChar.container.x = state.x;
        isoChar.container.y = state.y;
    }

    // Update interaction container position
    if (interactionContainer) {
        interactionContainer.style.left = `${state.x - 40}px`;
        interactionContainer.style.top = `${state.y - 60}px`;
    }

    // Update speech bubble position
    updateSpeechBubblePosition();
}

// // Move avatar towards target (Removed)

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
    const avatarWidth = 80; // Approximate width of isometric character

    // Position above and centered on avatar
    let bubbleX = state.x - (bubbleWidth / 2);
    let bubbleY = state.y - speechBubble.offsetHeight - 60; // Offset more for the taller iso char

    // Keep within screen bounds
    bubbleX = Math.max(10, Math.min(window.innerWidth - bubbleWidth - 10, bubbleX));
    bubbleY = Math.max(10, bubbleY);

    speechBubble.style.left = `${bubbleX}px`;
    speechBubble.style.top = `${bubbleY}px`;
}

// ==========================================
// SPEECH & OLLAMA INTEGRATION
// ==========================================

const micBtn = document.getElementById('mic-btn');
let recognition = null;
let isListening = false;

// Initialize Speech Recognition (ElevenLabs Scribe)
async function initSpeechRecognition() {
    let scribeStream = null;

    async function startScribing() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // ElevenLabs Scribe Streaming logic (Using the official realtime endpoint)
            const socket = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime`);

            socket.onopen = () => {
                console.log('ElevenLabs: Scribe WebSocket connected');

                // Audio processing
                const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                const source = audioContext.createMediaStreamSource(stream);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);

                source.connect(processor);
                processor.connect(audioContext.destination);

                processor.onaudioprocess = (e) => {
                    if (!isListening) {
                        socket.close();
                        audioContext.close();
                        return;
                    }
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert to 16bit PCM
                    const buffer = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }

                    // Send raw binary PCM data directly (as expected by ElevenLabs Scribe v2)
                    socket.send(buffer.buffer);
                };
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript' && data.is_final) {
                    const transcript = data.text;
                    console.log('ElevenLabs Result:', transcript);
                    showSpeechBubble(`You: "${transcript}"`, 'normal', 2500);

                    isListening = false;
                    if (micBtn) micBtn.style.background = 'white';

                    setTimeout(() => {
                        queryOllama(transcript);
                    }, 2500);

                    socket.close();
                }
            };

            socket.onerror = (err) => {
                console.error('ElevenLabs STT Error:', err);
                showSpeechBubble("Speech error! 🎙️", 'thinking', 3000);
                isListening = false;
                if (micBtn) micBtn.style.background = 'white';
            };

        } catch (err) {
            console.error('Failed to start ElevenLabs Scribe:', err);
            showSpeechBubble("Mic error. Check permissions! 🎙️", 'thinking', 3000);
            isListening = false;
            if (micBtn) micBtn.style.background = 'white';
        }
    }

    // Attach click listener
    if (micBtn) {
        micBtn.style.display = 'flex'; // show button
        micBtn.addEventListener('click', () => {
            if (isListening) {
                isListening = false;
                micBtn.style.background = 'white';
            } else {
                if (!CONFIG.ELEVENLABS_API_KEY) {
                    showSpeechBubble("Need ElevenLabs API Key! 🔑", 'thinking', 4000);
                    return;
                }
                isListening = true;
                micBtn.style.background = '#ffcccc'; // light red
                showSpeechBubble("Listening...", 'thinking', 0);
                startScribing();
            }
        });
    }
}

// Query Local Ollama Instance
async function queryOllama(prompt) {
    showSpeechBubble("Thinking... 🤔", 'thinking', 0); // Keep thinking bubble open
    try {
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3:8b',
                prompt: `You are an AI avatar assistant. Be extremely concise and playful. Reply to: "${prompt}"`,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const llmReply = data.response;

        // Future proofing: Check for gestures in LLM output if needed, but for now just peak
        if (isoChar) {
            isoChar.setGesture('speak'); // Placeholder
        }

        showSpeechBubble(llmReply, 'excited', 10000);

        // ElevenLabs TTS (Guarded by flag)
        if (CONFIG.ENABLE_TTS) {
            playTTSReply(llmReply);
        }

    } catch (error) {
        console.error('Ollama Query Failed:', error);
        showSpeechBubble("Could not connect to my brain (Ollama). Is it running? 🧠🔌", 'thinking', 5000);
    }
}

// Play TTS using ElevenLabs
async function playTTSReply(text) {
    if (!CONFIG.ELEVENLABS_API_KEY) return;

    try {
        console.log('Playing ElevenLabs TTS...');
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        if (!response.ok) throw new Error('TTS API request failed');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (err) {
        console.error('TTS Error:', err);
    }
}



// Uses window.PIXI from CDN


// Initialize Isometric Character
let isoChar;

async function setupIsometric() {
    try {
        console.log('Setting up Isometric Character...');
        isoChar = new IsometricCharacter(app);
        console.log('Isometric Character ready:', isoChar);
    } catch (err) {
        console.error('Failed to setup isometric character:', err);
        // Create a visual indicator of error
        const errDiv = document.createElement('div');
        errDiv.style.color = 'red';
        errDiv.style.position = 'fixed';
        errDiv.style.bottom = '10px';
        errDiv.innerText = 'Pixi Error: ' + err.message;
        document.body.appendChild(errDiv);
    }
}

// Initialize PixiJS Application
const app = new PIXI.Application();

async function initPixi() {
    try {
        console.log('--- PixiJS v8 Startup ---');
        console.log('PIXI Global:', typeof PIXI !== 'undefined' ? PIXI.VERSION : 'undefined');

        await app.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundAlpha: 0, // Fully transparent
            resizeTo: window,
            antialias: true,
            hello: true
        });

        document.getElementById('game-container').appendChild(app.canvas);

        // Ensure visible
        if (app.canvas && app.canvas.style) {
            app.canvas.style.opacity = '1';
            app.canvas.style.display = 'block';
            app.canvas.style.border = 'none';
        }

        // Scale mode in v8
        try {
            if (PIXI.TextureSource) {
                PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
            }
        } catch (scaleErr) { console.warn(scaleErr); }

        // Start setup
        await setupIsometric();

        // Initialize STT 
        initSpeechRecognition();

        // Initialize loops
        initAvatar();
        gameLoop();
    } catch (e) {
        console.error('PixiJS Init Failed:', e);
        showSpeechBubble("Initialization error! 🛠️", 'thinking');
    }
}

initPixi();



// Animation loop
function gameLoop() {
    requestAnimationFrame(gameLoop);
}

// Handle window resize
window.addEventListener('resize', () => {
    updateAvatarPosition();
});

console.log('🌟 AI Avatar initialized with Isometric Procedural Animation!');
