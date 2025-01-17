import express from 'express';
import { createRoutes } from './routes/routes';

import { createServer as createServerHttp, Server as HTTPServer } from 'http';
import { createServer as createServerHttps, Server as HTTPSServer } from 'https';
import { Server as SocketIOServer } from 'socket.io';
import { SocketServer } from './core/live/SocketServer';

import { connectDatabase } from './core/db/db';

import { config } from './utils/config';
import { logger } from './utils/logger';

import fs from 'fs';
import path from 'path';

// Connect to the database
connectDatabase();

// Create the global express app
export const expressApp = express();

// Use JSON to parse bodies
expressApp.use(express.json());

// CORS makes me sad
expressApp.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', '*');
  // Update: really, DELETE causes this to be a problem
  res.set('Access-Control-Allow-Methods', '*');
  next();
});

// Create the http server
let httpServer: HTTPServer | HTTPSServer;
if (config.mode === 'PRODUCTION') {
  httpServer = createServerHttps({
    key: fs.readFileSync(path.resolve('./private_key.pem')),
    cert: fs.readFileSync(path.resolve('./certificate.pem')),
  }, expressApp);
}
else {
  httpServer = createServerHttp(expressApp);
}

// Create the socket.io server
export const ioServer = new SocketIOServer(httpServer, {
  path: '/server/live/socket.io',
  // Buffer size     1 KB   1 MB   10 MB
  maxHttpBufferSize: 1000 * 1000 * 10,
  // Update: CORS still makes me sad
  cors: {
    origin: '*',
    methods: '*',
    allowedHeaders: '*',
    credentials: false,
  },
  transports: ['websocket'],
  pingInterval: 20000, // Send pings every 20 seconds
  pingTimeout: 5000, // Expect a response within 5 seconds
});

// Create the SocketServer
export const liveServer = new SocketServer(ioServer);

// Add the routes
createRoutes(expressApp);

// Listen on the correct port
const PORT = config.mode === 'DEVELOPMENT' ? config.devPort : config.prodPort;
httpServer.listen(PORT, () => {
  logger.info(`Express server successfully started on port ${PORT}.`);
});