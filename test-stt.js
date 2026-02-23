require('dotenv').config();
const WebSocket = require('ws');

const apiKey = process.env.ELEVENLABS_API_KEY;

const ws = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime`, {
    headers: { 'xi-api-key': apiKey }
});

ws.on('open', () => {
    console.log('[WS] Connected');

    const dummyData = new Int16Array(4096).fill(0);
    const base64Audio = Buffer.from(dummyData.buffer).toString('base64');

    const payload = JSON.stringify({
        message_type: "input_audio_chunk",
        audio_base_64: base64Audio,
        commit: false,
        sample_rate: 16000
    });

    console.log('Sending audio chunk...');
    ws.send(payload);

    setTimeout(() => {
        console.log('Closing client...');
        ws.close();
    }, 2000);
});

ws.on('message', (data) => console.log('[Message]:', data.toString()));
ws.on('error', (err) => console.error('[Error]:', err));
ws.on('close', (code, reason) => console.log('[Close]:', code, reason.toString()));
