require('dotenv').config();
const WebSocket = require('ws');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
    console.error('No API key found in .env');
    process.exit(1);
}

console.log('Testing with xi-api-key header...');
const wsToken = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime`, {
    headers: {
        'xi-api-key': apiKey
    }
});

wsToken.on('open', () => {
    console.log('[Token Auth] SUCCESS: Connected to ElevenLabs WebSocket');

    // Simulate sending an audio chunk
    console.log('Sending dummy audio chunk...');
    const dummyData = new Int16Array(4096).fill(0); // 4096 silence samples
    const base64Audio = Buffer.from(dummyData.buffer).toString('base64');

    // Try sending raw binary
    wsToken.send(dummyData.buffer);

    setTimeout(() => {
        // Send EOS frame?
        wsToken.send(JSON.stringify({ text: "" }));
    }, 1000);
});

wsToken.on('message', (data) => {
    console.log('[Message Received]:', data.toString());
});

wsToken.on('error', (err) => {
    console.error('[Token Auth] ERROR:', err.message);
});

wsToken.on('unexpected-response', (request, response) => {
    console.error(`[Token Auth] Unexpected response code: ${response.statusCode}`);
});
