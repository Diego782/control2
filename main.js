const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 4000 });

wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', message => {
        // message is a Buffer
        console.log('Received GPS data (raw buffer):', message);
        console.log('Received GPS data (hex):', message.toString('hex'));
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server is running on ws://localhost:8080');