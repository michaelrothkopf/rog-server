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
  path: '/live/gameserver',
  // Buffer size     1 KB   1 MB   10 MB
  maxHttpBufferSize: 1000 * 1000 * 10,
});

// Create the SocketServer
export const liveServer = new SocketServer(ioServer);

// Use JSON to parse bodies
expressApp.use(express.json());

// Add the routes
createRoutes(expressApp);

// Listen on the correct port
const PORT = config.mode === 'DEVELOPMENT' ? config.devPort : config.prodPort;
httpServer.listen(PORT, () => {
  logger.info(`Express server successfully started on port ${PORT}.`);
});