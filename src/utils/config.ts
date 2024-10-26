import { logger } from './logger';

interface AppConfig {
  // The mongoDB host url
  dbUrl: string;
  // The password to access the admin panel
  adminPassword: string;
  // The server URL Express should bind to
  serverUrl: string;
  // The ports the server should bind to
  devPort: number;
  prodPort: number;
  // The mode the server operates in (DEVELOPMENT or PRODUCTION)
  mode: string;
  // The folder for the game data
  dataFolderPath: string,
}

// Attempt to retrieve the configuration options from environment variables
const dbUrl = process.env.NAGNAM_NODE_DB_URL;
if (!dbUrl || typeof dbUrl !== 'string') {
  logger.emerg(`Invalid database connection URL; not provided in environment variables. Value received ${dbUrl}`);
  // Exit with an emergency error
  process.exit(-1);
}
const adminPassword = process.env.NAGNAM_NODE_ADMIN_PASSWORD;
if (!adminPassword || typeof adminPassword !== 'string') {
  logger.emerg(`Invalid admin password; not provided in environment variables. Value received ${adminPassword}`);
  
  process.exit(-1);
}

const serverUrl = process.env.NAGNAM_NODE_SERVER_URL;
if (!serverUrl || typeof serverUrl !== 'string') {
  logger.emerg(`Invalid server URL; not provided in environment variables. Value received ${serverUrl}`);
  process.exit(-1);
}
const devPort = process.env.NAGNAM_NODE_DEV_PORT;
if (!devPort || typeof devPort !== 'string' || isNaN(+devPort)) {
  logger.emerg(`Invalid development port; not provided in environment variables. Value received ${devPort}`);
  process.exit(-1);
}
const prodPort = process.env.NAGNAM_NODE_PROD_PORT;
if (!prodPort || typeof prodPort !== 'string' || isNaN(+prodPort)) {
  logger.emerg(`Invalid production port; not provided in environment variables. Value received ${prodPort}`);
  process.exit(-1);
}
const mode = process.env.NAGNAM_NODE_MODE;
if (!mode || typeof mode !== 'string') {
  logger.emerg(`Invalid application mode; not provided in environment variables. Value received ${mode}`);
  process.exit(-1);
}
const dataFolderPath = process.env.NAGNAM_NODE_DATA_FOLDER_PATH;
if (!dataFolderPath || typeof dataFolderPath !== 'string') {
  logger.emerg(`Invalid data folder path; not provided in environment variables. Value received ${dataFolderPath}`);
  process.exit(-1);
}

export const config: AppConfig = {
  dbUrl,

  adminPassword,
  serverUrl,
  devPort: Number(devPort),
  prodPort: Number(prodPort),

  mode,

  dataFolderPath,
};