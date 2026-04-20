import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { config } from './index';
import { logger } from './logger';

let mqttClient: MqttClient | null = null;

export function getMqttClient(): MqttClient {
  if (!mqttClient) {
    const options: IClientOptions = {
      clientId: config.MQTT_CLIENT_ID,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      protocolVersion: 5,
    };

    if (config.MQTT_USERNAME) {
      options.username = config.MQTT_USERNAME;
    }
    if (config.MQTT_PASSWORD) {
      options.password = config.MQTT_PASSWORD;
    }

    mqttClient = mqtt.connect(config.MQTT_BROKER_URL, options);

    mqttClient.on('connect', () => {
      logger.info('MQTT broker connected', {
        broker: config.MQTT_BROKER_URL,
        clientId: config.MQTT_CLIENT_ID,
      });
    });

    mqttClient.on('reconnect', () => {
      logger.warn('MQTT reconnecting...');
    });

    mqttClient.on('error', (err) => {
      logger.error('MQTT connection error', { error: err.message });
    });

    mqttClient.on('close', () => {
      logger.warn('MQTT connection closed');
    });

    mqttClient.on('offline', () => {
      logger.warn('MQTT client offline');
    });
  }

  return mqttClient;
}

export function subscribeMqttTopics(topics: string[]): void {
  const client = getMqttClient();
  topics.forEach((topic) => {
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`MQTT: failed to subscribe to ${topic}`, { error: err.message });
      } else {
        logger.info(`MQTT: subscribed to ${topic}`);
      }
    });
  });
}

export async function disconnectMqtt(): Promise<void> {
  return new Promise((resolve) => {
    if (mqttClient) {
      mqttClient.end(false, {}, () => {
        mqttClient = null;
        logger.info('MQTT disconnected');
        resolve();
      });
    } else {
      resolve();
    }
  });
}
