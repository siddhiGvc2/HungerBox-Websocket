const mqtt = require('mqtt');
const WebSocket = require('ws');

const MQTT_BROKER_URL = 'mqtt://165.232.180.111'; // Public test broker URL; change as needed
const MQTT_TOPIC = 'HB/ALL';

const MQTT_USERNAME = 'gvcMqttServer'; // Sample username
const MQTT_PASSWORD = 'gvcMqttServer'; // Sample password

// Connect to the MQTT broker with username and password
const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      console.error('Failed to subscribe to topic:', MQTT_TOPIC);
    } else {
      console.log(`Subscribed to MQTT topic: ${MQTT_TOPIC}`);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('MQTT error:', err);
});

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 2020 });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // Receive messages from WebSocket clients and publish to MQTT
  ws.on('message', (message) => {
    console.log('Received from WS client:', message);
    let parsed;
    try {
      parsed = JSON.parse(message);
      const { topic, payload } = parsed;
      if (typeof topic === 'string' && typeof payload === 'string') {
        mqttClient.publish(topic, payload);
        console.log(`Published to MQTT topic: ${topic}`);
      } else {
        console.error('Invalid message format: "topic" and "payload" fields must be strings');
      }
    } catch (e) {
      console.error('Failed to parse message as JSON:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Forward MQTT messages received to all WebSocket clients
mqttClient.on('message', (topic, message) => {
  if (topic === MQTT_TOPIC) {
    const msgString = message.toString();
    console.log('Received from MQTT:', msgString);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msgString);
      }
    });
  }
});

console.log('WebSocket server started on ws://localhost:3030');
