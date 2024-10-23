import express from 'express';
import { createRoutes } from './routes/routes';
import { config } from './utils/config';
import { logger } from './utils/logger';
import { User } from './core/db/schemas/User.model';
import { connectDatabase } from './core/db/db';

// Connect to the database
connectDatabase();

// Create the global express app
export const expressApp = express();

// Use JSON to parse bodies
expressApp.use(express.json());

// Add the routes
createRoutes(expressApp);

// Listen on the correct port
const PORT = config.mode === 'DEVELOPMENT' ? config.devPort : config.prodPort;
expressApp.listen(PORT, () => {
  logger.info(`Express server successfully started on port ${PORT}.`);
});