import mongoose from 'mongoose';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';

export const connectDatabase = () => {
  mongoose.connect(config.dbUrl).then(
    // If the connection is successful
    () => {
      logger.info(`Successfully connected to MongoDB database via Mongoose.`);
    },
    // If there is an error
    (e) => {
      logger.emerg(`Unable to connect to database at provided URL. Error: ${e}`);
      process.exit(-1);
    }
  );
}