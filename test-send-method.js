const lib = require('@elevenlabs/client');
console.log(Object.keys(lib));
console.log('RealtimeConnection' in lib ? lib.RealtimeConnection.prototype.send.toString() : 'Not found');
