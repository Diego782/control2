const Gt06 = require('./gt06');
const Mqtt = require('mqtt');
const net = require('net');
const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');
const crc = require('./crc16'); // Necesitarás instalar el paquete crc: npm install crc

const serverPort = process.env.GT06_SERVER_PORT || 4000;
const rootTopic = process.env.MQTT_ROgtgvOT_TOPIC || 'gt06';
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
    let length = commandBuffer.length + 5;
    let message = Buffer.alloc(length);
    message[0] = 0x78;
    message[1] = 0x78;
    message[2] = length - 2;
    message[3] = 0x80; // Protocol number for command
    commandBuffer.copy(message, 4);
    appendCrc16(message);
    return message;
}

function appendCrc16(buffer) {
    let crc16 = crc.crc16xmodem(buffer.slice(0, buffer.length - 2));
    buffer.writeUInt16BE(crc16, buffer.length - 2);
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

const httpPort = 3000;
app.listen(httpPort, () => {
    console.log(`HTTP server is running on http://localhost:${httpPort}`);
});