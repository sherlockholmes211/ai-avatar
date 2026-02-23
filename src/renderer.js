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
        showSpeechBubble("Upload your pixel art, then just talk! 🎨🎙️", 'excited');
    }, 1500);
}

// Update speech bubble + avatar position
function updateAvatarPosition() {
    state.x = window.innerWidth - 140;
    state.y = 170;

    // PixelAvatar manages its own position internally
    if (isoChar && isoChar.updatePosition) {
        isoChar.updatePosition();
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

// ── VAD / STT CONFIGURATION ──────────────────────────────────────────────────
const VAD = {
    SILENCE_THRESHOLD: 0.01,   // RMS below this = silence
    SILENCE_DURATION: 1500,   // ms of silence after speech before auto-commit
    MIN_SPEECH_MS: 300,    // minimum speech before silence timer starts
    WAKE_UP_DELAY: 800,    // ms to wait before listening again after a response
};

// ── SYSTEM STATE ─────────────────────────────────────────────────────────────
//   'IDLE'       → mic is open, waiting for voice to start
//   'SPEAKING'   → voice detected, streaming to ElevenLabs
//   'PROCESSING' → committed, waiting for transcript + Ollama
let vadState = 'IDLE';
let isMuted = false;   // mic button toggles this
// ─────────────────────────────────────────────────────────────────────────────

function setVadState(newState) {
    vadState = newState;
    console.log(`VAD state → ${newState}`);
    updateMicVisual();
}

function updateMicVisual() {
    if (!micBtn) return;
    micBtn.style.transition = 'all 0.2s ease';
    if (isMuted) {
        micBtn.style.background = '#cccccc';
        micBtn.style.transform = 'scale(1)';
        micBtn.title = 'Unmute (click to talk again)';
    } else if (vadState === 'IDLE') {
        micBtn.style.background = 'white';
        micBtn.style.transform = 'scale(1)';
        micBtn.title = 'Listening for your voice...';
    } else if (vadState === 'SPEAKING') {
        micBtn.style.background = '#ff4444';
        micBtn.style.transform = 'scale(1.12)';
        micBtn.title = 'Hearing you!';
    } else if (vadState === 'PROCESSING') {
        micBtn.style.background = '#ffaa00';
        micBtn.style.transform = 'scale(1)';
        micBtn.title = 'Processing...';
    }
}

// ── CONTINUOUS HANDS-FREE LOOP ────────────────────────────────────────────────
async function initSpeechRecognition() {
    if (!CONFIG.ELEVENLABS_API_KEY) {
        showSpeechBubble("ElevenLabs API key missing! 🔑", 'thinking', 5000);
        console.error('ELEVENLABS_API_KEY not set — STT disabled.');
        return;
    }

    // AudioWorklet blob (avoids deprecated ScriptProcessorNode)
    const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
            constructor() {
                super();
                this._buf = [];
                this._size = 4096;
            }
            process(inputs) {
                const ch = inputs[0] && inputs[0][0];
                if (ch) {
                    for (let i = 0; i < ch.length; i++) this._buf.push(ch[i]);
                    while (this._buf.length >= this._size) {
                        this.port.postMessage({ pcm: new Float32Array(this._buf.splice(0, this._size)) });
                    }
                }
                return true;
            }
        }
        registerProcessor('pcm-processor', PCMProcessor);
    `;
    const workletBlobUrl = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));

    // ── Open mic ONCE and keep it open forever ────────────────────────────────
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error('Mic access denied:', err);
        showSpeechBubble("Mic access denied! 🎙️", 'thinking', 5000);
        return;
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    await audioContext.audioWorklet.addModule(workletBlobUrl);
    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    source.connect(workletNode);
    workletNode.connect(audioContext.destination);

    console.log('🎙️ Hands-free always-on listening started');
    showSpeechBubble("I'm always listening! Just speak 🎙️", 'excited', 3000);
    setVadState('IDLE');

    // ── Per-utterance session state (reset each time we go back to IDLE) ─────
    let socket = null;
    let silenceTimer = null;
    let hasSpeechStarted = false;
    let speechStartTime = null;
    // ─────────────────────────────────────────────────────────────────────────

    function computeRMS(f32) {
        let s = 0;
        for (let i = 0; i < f32.length; i++) s += f32[i] * f32[i];
        return Math.sqrt(s / f32.length);
    }

    function resetSession() {
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        socket = null;
        hasSpeechStarted = false;
        speechStartTime = null;
    }

    // Opens a fresh WS to ElevenLabs — called once per detected utterance
    function openElevenLabsSocket() {
        const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&xi-api-key=${CONFIG.ELEVENLABS_API_KEY}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log('ElevenLabs WS opened');

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.message_type === 'partial_transcript' && data.text) {
                showSpeechBubble(`"${data.text}..."`, 'normal', 0);

            } else if (data.message_type === 'committed_transcript') {
                const transcript = data.text?.trim();
                console.log('ElevenLabs transcript:', transcript);

                setVadState('PROCESSING');

                if (transcript) {
                    showSpeechBubble(`You: "${transcript}"`, 'normal', 3000);
                    // Query Ollama — VAD loop resumes after response
                    setTimeout(() => queryOllama(transcript), 500);
                } else {
                    // Empty transcript — skip Ollama, go back to listening
                    console.log('VAD: empty transcript, resetting');
                    resetSession();
                    setTimeout(() => setVadState('IDLE'), 500);
                }
                ws.close();

            } else if (data.message_type === 'input_error' || data.message_type === 'transcriber_error') {
                console.error('ElevenLabs STT error:', data.error);
                resetSession();
                setVadState('IDLE');
            } else {
                console.log('ElevenLabs WS msg:', data);
            }
        };

        ws.onerror = (err) => {
            console.error('ElevenLabs WS error:', err);
            showSpeechBubble("STT error — will retry on next speech 🔄", 'thinking', 3000);
            resetSession();
            setVadState('IDLE');
        };

        ws.onclose = (e) => console.log(`ElevenLabs WS closed (${e.code})`);
        return ws;
    }

    // Called after VAD_SILENCE_DURATION ms of quiet — tells ElevenLabs we're done
    function commitAudio() {
        if (vadState !== 'SPEAKING') return;
        console.log('VAD: silence timeout — committing audio');
        setVadState('PROCESSING');

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                message_type: 'input_audio_chunk',
                audio_base_64: '',
                commit: true
            }));
        }
    }

    // ── Main audio loop: runs for every 4096-sample chunk ────────────────────
    workletNode.port.onmessage = (e) => {
        if (isMuted || vadState === 'PROCESSING') return;

        const pcm = e.data.pcm;
        const rms = computeRMS(pcm);
        const isVoice = rms > VAD.SILENCE_THRESHOLD;

        // IDLE: waiting for voice to start
        if (vadState === 'IDLE') {
            if (isVoice) {
                hasSpeechStarted = true;
                speechStartTime = Date.now();
                socket = openElevenLabsSocket();
                setVadState('SPEAKING');
                showSpeechBubble('Listening... 🎙️', 'thinking', 0);
            }
            return; // don't send audio while IDLE — no WS open yet
        }

        // SPEAKING: voice is detected, stream to ElevenLabs
        if (vadState === 'SPEAKING') {
            // Convert Float32 → 16-bit PCM → Base64 → send
            const buf = new Int16Array(pcm.length);
            for (let i = 0; i < pcm.length; i++) {
                buf[i] = Math.max(-1, Math.min(1, pcm[i])) * 0x7FFF;
            }
            const b64 = Buffer.from(buf.buffer).toString('base64');
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: b64 }));
            }

            if (isVoice) {
                // Still speaking — cancel any silence timer
                if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
                updateMicVisual();
            } else {
                // Gone quiet — start silence countdown
                const elapsed = Date.now() - speechStartTime;
                if (micBtn) { micBtn.style.background = '#ffcccc'; micBtn.style.transform = 'scale(1)'; }
                if (elapsed >= VAD.MIN_SPEECH_MS && !silenceTimer) {
                    silenceTimer = setTimeout(commitAudio, VAD.SILENCE_DURATION);
                }
            }
        }
    };

    // ── Mic button = mute / unmute toggle ────────────────────────────────────
    if (micBtn) {
        micBtn.style.display = 'flex';
        micBtn.title = 'Mute / Unmute';
        micBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            if (isMuted) {
                showSpeechBubble("Muted 🔇 Click mic to unmute", 'thinking', 3000);
                if (silenceTimer) clearTimeout(silenceTimer);
                if (socket && socket.readyState === WebSocket.OPEN) socket.close();
                resetSession();
                setVadState('IDLE');
            } else {
                showSpeechBubble("Unmuted! Just speak 🎙️", 'excited', 2000);
                setVadState('IDLE');
            }
        });
    }
}

// Query Local Ollama Instance — resets VAD to IDLE after response
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

        // Detect emote from LLM response and play it
        if (isoChar) {
            const emote = detectEmote(llmReply);
            isoChar.setEmote(emote, 3000);
        }

        showSpeechBubble(llmReply, 'excited', 10000);

        // ElevenLabs TTS (Guarded by flag)
        if (CONFIG.ENABLE_TTS) {
            playTTSReply(llmReply);
        }

        // ── Resume hands-free listening after the reply ──
        // Wait a bit so the user can read the response before we start capturing again
        setTimeout(() => {
            setVadState('IDLE');
        }, VAD.WAKE_UP_DELAY);

    } catch (error) {
        console.error('Ollama Query Failed:', error);
        showSpeechBubble("Could not connect to my brain (Ollama). Is it running? 🧠🔌", 'thinking', 5000);
        // Resume listening even on error
        setTimeout(() => setVadState('IDLE'), VAD.WAKE_UP_DELAY);
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


// Initialize Pixel Avatar
let isoChar;

async function setupIsometric() {
    try {
        console.log('Setting up Pixel Avatar...');
        isoChar = new PixelAvatar(app);
        console.log('Pixel Avatar ready:', isoChar);
    } catch (err) {
        console.error('Failed to setup Pixel Avatar:', err);
        const errDiv = document.createElement('div');
        errDiv.style.color = 'red';
        errDiv.style.position = 'fixed';
        errDiv.style.bottom = '10px';
        errDiv.innerText = 'Avatar Error: ' + err.message;
        document.body.appendChild(errDiv);
    }
}

// Detect emote from LLM reply text
function detectEmote(text) {
    const t = text.toLowerCase();
    if (/\b(haha|lol|amazing|awesome|wow|yay|congrats|love|happy|great|fantastic|:-?\)|😄|🎉|🥳)/.test(t)) return 'excited';
    if (/\b(think|hmm|maybe|wonder|consider|ponder|let me|well\b|interesting|🤔|hmm)/.test(t)) return 'thinking';
    if (/\b(error|fail|sorry|oops|wrong|can't|cannot|unable|broken|😔|😢)/.test(t)) return 'shake';
    if (/\b(hello|hi |hey |welcome|nice to meet|glad|good morning|good evening)/.test(t)) return 'happy';
    return 'speaking'; // default when talking
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
