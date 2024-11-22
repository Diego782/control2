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

    // Agregar un registro para cualquier dato recibido del GPS
    client.on('data', (data) => {
        console.log('Received data from GPS:', data.toString('hex'));
    });
});

server.listen(serverPort, () => {
    console.log('started server on port:', serverPort);
});

// Serve static files from the "dist" directory
app.use(express.static(path.join(__dirname, 'dist')));

function SendCommand(commandNumber) {
    let commandBuffer;
    
    switch (commandNumber) {
        case 0: // Apagar el carro
            commandBuffer = Buffer.from([0x78, 0x78, 0x15, 0x80, 0x0F, 0x00, 0x01, 0xA9, 0x61, 0x44, 0x59, 0x44, 0x2C, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x23, 0x00, 0xA0, 0x3E, 0x10, 0x0D, 0x0A]);
            break;
        case 1: // Encender el carro
            commandBuffer = Buffer.from([0x78, 0x78, 0x19, 0x15, 0x11, 0x00, 0x01, 0xA9, 0x63, 0x48, 0x46, 0x59, 0x44, 0x3D, 0x53, 0x75, 0x63, 0x63, 0x65, 0x73, 0x73, 0x21, 0x00, 0x02, 0x00, 0x1E, 0xF8, 0x93, 0x0D, 0x0A]);
            break;
        default:
            console.error('Comando no reconocido');
            return;
    }

    if (gpsClient) {
        gpsClient.write(commandBuffer);
        console.log('Command sent:', commandBuffer.toString('hex'));
    } else {
        console.error('No GPS client connected');
    }
}

function appendCrc16(buffer) {
    let crc16 = getCrc16(buffer.slice(0, buffer.length - 4));
    crc16.copy(buffer, buffer.length - 4);
}

app.get('/send-command/:commandNumber', (req, res) => {
    const commandNumber = parseInt(req.params.commandNumber, 10);
    SendCommand(commandNumber);
    res.send(`Command ${commandNumber} sent to GPS`);
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