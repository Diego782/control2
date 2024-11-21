const Gt06 = require('./gt06');
const mqtt = require('mqtt');
const net = require('net');
const express = require('express');
const app = express();
const fs = require('fs');
const crc16 = require('./crc16');


const serverPort = process.env.GT06_SERVER_PORT || 4000;
const rootTopic = process.env.MQTT_ROOT_TOPIC || 'gt06';
const brokerUrl = process.env.MQTT_BROKER_URL || '11ec3ffa829840c785105a23a3994db1.s1.eu.hivemq.cloud';
const brokerPort = process.env.MQTT_BROKER_PORT || 1883;
const mqttProtocol = process.env.MQTT_BROKER_PROTO || 'mqtt';
const brokerUser = process.env.MQTT_BROKER_USER || 'DiegoGPS';
const brokerPasswd = process.env.MQTT_BROKER_PASSWD || 'Dl1042248136!';
app.use(express.static(path.join(__dirname, 'dist' )));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
var mqttClient = mqtt.connect(
    {
        host: brokerUrl,
        port: brokerPort,
        protocol: mqttProtocol,
        username: brokerUser,
        password: brokerPasswd
    }
);

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
app.use(express.static('dist'));

app.get('/send-command/:command', (req, res) => {
    const command = req.params.command;
    if (gpsClient) {
        gpsClient.write(command);
        res.send(`Command ${command} sent to GPS`);
    } else {
        res.send('No GPS client connected');
    }
});

const httpPort = 3000;
app.listen(httpPort, () => {
    console.log(`HTTP server is running on http://localhost:${httpPort}`);
});