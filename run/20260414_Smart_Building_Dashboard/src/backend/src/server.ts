import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis, getRedisClient } from './config/redis';
import { getMqttClient, subscribeMqttTopics, disconnectMqtt } from './config/mqtt';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import apiRoutes from './modules';

// =============================================================================
// Express App Setup
// =============================================================================

const app = express();
const server = http.createServer(app);

// --- Security middleware ---
app.use(
  helmet({
    contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// --- CORS ---
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// --- Body parsing ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// --- Compression ---
app.use(compression());

// --- Logging ---
const morganStream = {
  write: (message: string) => logger.info(message.trim(), { type: 'http' }),
};
app.use(
  morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: morganStream,
  })
);

// --- Rate limiter (general) ---
app.use(rateLimiter());

// --- Static file serving for uploads ---
app.use(
  '/uploads',
  express.static(path.resolve(config.UPLOAD_DIR), {
    maxAge: '1d',
    etag: true,
  })
);

// =============================================================================
// Health Check
// =============================================================================

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'smart-building-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

// =============================================================================
// API Routes
// =============================================================================

app.use('/api/v1', apiRoutes);

// --- 404 handler ---
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// --- Global error handler (must be last) ---
app.use(errorHandler);

// =============================================================================
// Socket.IO Setup
// =============================================================================

const io = new SocketIOServer(server, {
  cors: {
    origin: config.SOCKETIO_CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.JWT_SECRET);
    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const user = (socket as any).user;
  logger.info('Socket.IO client connected', { socketId: socket.id, userId: user?.userId });

  // Validate UUID format for room IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Join building-specific rooms
  socket.on('join:building', (buildingId: string) => {
    if (typeof buildingId !== 'string' || !uuidRegex.test(buildingId)) {
      logger.warn('Socket.IO: invalid buildingId for join:building', { socketId: socket.id, buildingId });
      return;
    }
    socket.join(`building:${buildingId}`);
    logger.debug('Client joined building room', { socketId: socket.id, buildingId });
  });

  socket.on('leave:building', (buildingId: string) => {
    if (typeof buildingId !== 'string' || !uuidRegex.test(buildingId)) return;
    socket.leave(`building:${buildingId}`);
    logger.debug('Client left building room', { socketId: socket.id, buildingId });
  });

  // Join zone-specific rooms
  socket.on('join:zone', (zoneId: string) => {
    if (typeof zoneId !== 'string' || !uuidRegex.test(zoneId)) {
      logger.warn('Socket.IO: invalid zoneId for join:zone', { socketId: socket.id, zoneId });
      return;
    }
    socket.join(`zone:${zoneId}`);
  });

  socket.on('leave:zone', (zoneId: string) => {
    if (typeof zoneId !== 'string' || !uuidRegex.test(zoneId)) return;
    socket.leave(`zone:${zoneId}`);
  });

  socket.on('disconnect', (reason) => {
    logger.debug('Socket.IO client disconnected', { socketId: socket.id, reason });
  });
});

// Export io for use in route handlers / services
export { io };

// =============================================================================
// MQTT Subscriber Setup
// =============================================================================

function setupMqttSubscriber(): void {
  const mqttClient = getMqttClient();
  const topicPrefix = config.MQTT_TOPIC_PREFIX;

  // Subscribe to all sensor data topics: building/+/sensor/#
  subscribeMqttTopics([`${topicPrefix}+/sensor/#`]);

  mqttClient.on('message', (topic: string, payload: Buffer) => {
    try {
      const message = JSON.parse(payload.toString());
      logger.debug('MQTT message received', { topic, message });

      // This will be wired to the ingestion service in subsequent implementation
      // For now, broadcast raw data to Socket.IO for real-time display
      // The full ingestion pipeline (validate → store → alert → broadcast)
      // will be implemented in the MQTT service module.
    } catch (error) {
      logger.error('Failed to parse MQTT message', {
        topic,
        payload: payload.toString().substring(0, 500),
        error,
      });
    }
  });
}

// =============================================================================
// Server Startup
// =============================================================================

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Setup MQTT subscriber
    setupMqttSubscriber();

    // Start HTTP server
    server.listen(config.PORT, () => {
      logger.info(`Server started`, {
        port: config.PORT,
        environment: config.NODE_ENV,
        pid: process.pid,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close all Socket.IO connections
  io.close(() => {
    logger.info('Socket.IO server closed');
  });

  try {
    await disconnectMqtt();
    await disconnectRedis();
    await disconnectDatabase();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise: String(promise) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Start the server
startServer();

export default app;
