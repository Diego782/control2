const net = require('net');

const server = net.createServer(socket => {
    console.log('Client connected');

    socket.on('data', data => {
        // data is a Buffer
        console.log('Received GPS data (raw buffer):', data);
        console.log('Received GPS data (hex):', data.toString('hex'));
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });
});

server.listen(4000, () => {
    console.log('TCP server is running on port 4000');
});