const mqtt = require('mqtt');
const WebSocket = require('ws');
const fs = require('fs');

const MQTT_BROKER_URL = 'mqtts://gvcsystems.com:8883';
const MQTT_TOPIC = 'HB/ALL';

const MQTT_USERNAME = 'gvcsystems';
const MQTT_PASSWORD = 'vkbd@070361M';

// Load CA certificate
const caCert = fs.readFileSync('./ca.crt');

// Connect to MQTTS broker
const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  ca: caCert,
  protocol: 'mqtts',
  rejectUnauthorized: true, // IMPORTANT
  keepalive: 60,
  reconnectPeriod: 5000,
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTTS broker');
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe:', err.message);
    } else {
      console.log(`📡 Subscribed to: ${MQTT_TOPIC}`);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT error:', err.message);
});

mqttClient.on('close', () => {
  console.log('⚠ MQTT connection closed');
});

// WebSocket server
const wss = new WebSocket.Server({ port: 3030 });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      const { topic, payload } = parsed;

      if (typeof topic === 'string' && typeof payload === 'string') {
        mqttClient.publish(topic, payload, { qos: 0 });
        console.log(`➡ WS → MQTT [${topic}]`);
      } else {
        console.error('❌ Invalid WS message format');
      }
    } catch (err) {
      console.error('❌ WS JSON parse error:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// Forward MQTT → WebSocket
mqttClient.on('message', (topic, message) => {
  const msg = message.toString();
  console.log(`⬅ MQTT → WS [${topic}]:`, msg);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ topic, payload: msg }));
    }
  });
});

console.log('🚀 WebSocket server running at ws://localhost:3030');
