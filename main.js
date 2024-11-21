const Gt06 = require('./gt06');
const Mqtt = require('mqtt');
const net = require('net');
const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');
const getCrc16 = require('./crc16'); // Importa la función getCrc16

const serverPort = process.env.GT06_SERVER_PORT || 4000;
const rootTopic = process.env.MQTT_ROOT_TOPIC || 'gt06';
const brokerUrl = process.env.MQTT_BROKER_URL || '7eb3252c060046b5981c2b54688b5a91.s1.eu.hivemq.cloud';
const brokerPort = process.env.MQTT_BROKER_PORT || 1883;
const mqttProtocol = process.env.MQTT_BROKER_PROTO || 'mqtt';
const brokerUser = process.env.MQTT_BROKER_USER || 'DiegoGPS2';
const brokerPasswd = process.env.MQTT_BROKER_PASSWD || 'Dl1042248136.';

var mqttClient = Mqtt.connect({
    host: brokerUrl,
    port: brokerPort,
    protocol: mqttProtocol,
    username: brokerUser,
    password: brokerPasswd,
    connectTimeout: 60 * 1000 // Aumentar el tiempo de espera a 60 segundos
});

mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
});

let gpsClient;

var server = net.createServer((client) => {
    var gt06 = new Gt06();
    console.log('client connected');
    gpsClient = client;

    server.on('error', (err) => {
        console.error('server error', err);
    });

    client.on('error', (err) => {
        console.error('client error', err);
    });

    client.on('close', () => {
        console.log('client disconnected');
        gpsClient = null;
    });

    client.on('data', (data) => {
        try {
            gt06.parse(data);
        }
        catch (e) {
            console.log('err', e);
            return;
        }
        if (gt06.event.string === 'location') {
         
        console.log('Latitude:', gt06.lat);
        console.log('Longitude:', gt06.lon);
        console.log('Hora:', gt06.fixTime);
        console.log('Rumbo:', gt06.course);
        console.log('velocidad:', gt06.speed);
 

        }
        console.log(gt06);
   
        if (gt06.expectsResponse) {
            client.write(gt06.responseMsg);
        }
        gt06.msgBuffer.forEach(msg => {
            mqttClient.publish(rootTopic + '/' + gt06.imei +
                '/pos', JSON.stringify(msg));
        });
        gt06.clearMsgBuffer();
    });
});

server.listen(serverPort, () => {
    console.log('started server on port:', serverPort);
});

// Serve static files from the "dist" directory
app.use(express.static(path.join(__dirname, 'dist')));

function createCommand(command) {
    let commandBuffer = Buffer.from(command, 'utf8');
    let length = commandBuffer.length + 9; // 1 byte para longitud, 1 byte para protocolo, 2 bytes para serial, 2 bytes para CRC, 2 bytes para fin
    let message = Buffer.alloc(length);
    message[0] = 0x78; // Código de inicio
    message[1] = 0x78; // Código de inicio
    message[2] = length - 2; // Longitud del paquete excluyendo el código de inicio
    message[3] = 0x40; // Número de protocolo
    message.writeUInt16BE(1, 4); // Número de serie (puedes incrementar este valor según sea necesario)
    commandBuffer.copy(message, 6); // Copiar el comando en el mensaje a partir del byte 6
    appendCrc16(message); // Añadir CRC16
    message[message.length - 2] = 0x0d; // Posición de fin
    message[message.length - 1] = 0x0a; // Posición de fin
    console.log('Command Message:', message.toString('hex')); // Registro del mensaje
    return message;
}

function appendCrc16(buffer) {
    let crc16 = getCrc16(buffer.slice(0, buffer.length - 4));
    crc16.copy(buffer, buffer.length - 4);
}

app.get('/send-command/:command', (req, res) => {
    const command = req.params.command;
    if (gpsClient) {
        const commandMessage = createCommand(command);
        gpsClient.write(commandMessage);
        res.send(`Command ${command} sent to GPS`);
    } else {
        res.send('No GPS client connected');
    }
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const httpPort = 3000;
app.listen(httpPort, () => {
    console.log(`HTTP server is running on http://localhost:${httpPort}`);
});