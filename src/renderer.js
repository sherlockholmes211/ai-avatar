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

    // AudioWorklet processor code as a blob URL (avoids deprecated ScriptProcessorNode)
    const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
            constructor() {
                super();
                this._buffer = [];
                this._bufferSize = 4096;
            }
            process(inputs) {
                const input = inputs[0];
                if (input && input[0]) {
                    const channelData = input[0];
                    for (let i = 0; i < channelData.length; i++) {
                        this._buffer.push(channelData[i]);
                    }
                    while (this._buffer.length >= this._bufferSize) {
                        const chunk = this._buffer.splice(0, this._bufferSize);
                        this.port.postMessage({ pcm: new Float32Array(chunk) });
                    }
                }
                return true;
            }
        }
        registerProcessor('pcm-processor', PCMProcessor);
    `;
    const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
    const workletBlobUrl = URL.createObjectURL(workletBlob);

    async function startScribing() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Pass API key as query param — browser WebSocket API doesn't support custom headers
            const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&xi-api-key=${CONFIG.ELEVENLABS_API_KEY}`;
            const socket = new WebSocket(wsUrl);

            socket.onopen = async () => {
                console.log('ElevenLabs: Scribe WebSocket connected');

                // Use AudioWorkletNode instead of deprecated ScriptProcessorNode
                const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                await audioContext.audioWorklet.addModule(workletBlobUrl);
                const source = audioContext.createMediaStreamSource(stream);
                const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

                source.connect(workletNode);
                workletNode.connect(audioContext.destination);

                // ── VAD STATE ────────────────────────────────────────────────
                const VAD_SILENCE_THRESHOLD = 0.01;  // RMS level below this = silence
                const VAD_SILENCE_DURATION = 1500;  // ms of silence before auto-stop
                const VAD_MIN_SPEECH_MS = 300;   // must speak at least this long first

                let hasSpeechStarted = false;  // did user say anything yet?
                let silenceTimer = null;   // setTimeout handle
                let speechStartTime = null;   // when did speech begin?
                let autoStopping = false;  // guard against double-fire
                // ─────────────────────────────────────────────────────────────

                function computeRMS(float32Array) {
                    let sum = 0;
                    for (let i = 0; i < float32Array.length; i++) {
                        sum += float32Array[i] * float32Array[i];
                    }
                    return Math.sqrt(sum / float32Array.length);
                }

                function triggerAutoStop() {
                    if (autoStopping || !isListening) return;
                    autoStopping = true;
                    console.log('VAD: silence detected — auto-committing');

                    isListening = false;
                    if (micBtn) {
                        micBtn.style.background = 'white';
                        micBtn.style.transform = 'scale(1)';
                        micBtn.style.transition = 'all 0.3s ease';
                    }

                    // Tell ElevenLabs we're done sending audio
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            message_type: 'input_audio_chunk',
                            audio_base_64: '',
                            commit: true
                        }));
                    }
                    audioContext.close();
                }

                workletNode.port.onmessage = (e) => {
                    if (!isListening || autoStopping) return;

                    const inputData = e.data.pcm;
                    const rms = computeRMS(inputData);

                    // ── VOICE ACTIVITY DETECTION ──────────────────────────────
                    if (rms > VAD_SILENCE_THRESHOLD) {
                        // Active speech detected
                        if (!hasSpeechStarted) {
                            hasSpeechStarted = true;
                            speechStartTime = Date.now();
                            console.log('VAD: speech started');
                            showSpeechBubble('Listening... 🎙️', 'thinking', 0);
                        }

                        // Voice is active → clear any pending silence timer
                        if (silenceTimer) {
                            clearTimeout(silenceTimer);
                            silenceTimer = null;
                        }

                        // Visual: mic pulses red while speaking
                        if (micBtn) {
                            micBtn.style.background = '#ff4444';
                            micBtn.style.transform = 'scale(1.1)';
                        }

                    } else if (hasSpeechStarted) {
                        // We've had speech before, now it's quiet
                        const speechDuration = Date.now() - speechStartTime;

                        // Visual: mic dims to indicate silence
                        if (micBtn) {
                            micBtn.style.background = '#ffcccc';
                            micBtn.style.transform = 'scale(1)';
                        }

                        // Only start silence timer after minimum speech duration
                        if (speechDuration >= VAD_MIN_SPEECH_MS && !silenceTimer) {
                            silenceTimer = setTimeout(() => {
                                triggerAutoStop();
                            }, VAD_SILENCE_DURATION);
                        }
                    }
                    // ─────────────────────────────────────────────────────────

                    // Convert Float32 to 16-bit PCM and send to ElevenLabs
                    const buffer = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }

                    const base64Audio = Buffer.from(buffer.buffer).toString('base64');

                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            message_type: 'input_audio_chunk',
                            audio_base_64: base64Audio
                        }));
                    }
                };
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);

                // Handle text updates
                if (data.message_type === 'partial_transcript') {
                    if (data.text) showSpeechBubble(`"${data.text}..."`, 'normal', 0);
                } else if (data.message_type === 'committed_transcript') {
                    const transcript = data.text;
                    console.log('ElevenLabs Result:', transcript);
                    showSpeechBubble(`You: "${transcript}"`, 'normal', 2500);

                    isListening = false;
                    if (micBtn) micBtn.style.background = 'white';

                    setTimeout(() => {
                        queryOllama(transcript);
                    }, 2500);

                    socket.close();
                } else if (data.message_type === 'input_error' || data.message_type === 'transcriber_error') {
                    console.error('ElevenLabs STT Error:', data.error);
                } else {
                    console.log('ElevenLabs WS message:', data);
                }
            };

            socket.onerror = (err) => {
                console.error('ElevenLabs STT Socket Error:', err);
                showSpeechBubble("Speech socket error! 🎙️", 'thinking', 3000);
                isListening = false;
                if (micBtn) micBtn.style.background = 'white';
            };

            socket.onclose = (event) => {
                console.log(`ElevenLabs WS closed: code=${event.code}, reason=${event.reason}`);
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
                micBtn.style.transform = 'scale(1)';
            } else {
                if (!CONFIG.ELEVENLABS_API_KEY) {
                    showSpeechBubble("Need ElevenLabs API Key! 🔑", 'thinking', 4000);
                    return;
                }
                isListening = true;
                micBtn.style.background = '#ffcccc'; // light red — waiting for speech
                micBtn.style.transform = 'scale(1)';
                showSpeechBubble("Say something... 🎙️", 'thinking', 0);
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
