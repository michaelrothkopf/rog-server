import winston from 'winston';

// Timestamp string for log file names
const timeString = Date.now();

const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `(${new Date().toISOString()}) ${level.toUpperCase()}: ${message}`;
});

export const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'user-service' },
  // transports: [
  //   new winston.transports.File({ filename: `log/${timeString}-error.log`, level: 'error' }),
  //   new winston.transports.File({ filename: `log/${timeString}-combined.log`, level: 'info' }),
  //   new winston.transports.File({ filename: `log/${timeString}-debug.log`, level: 'debug' }),
  // ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
    level: 'debug',
  }));
  logger.add(new winston.transports.File({ filename: `log/${timeString}-debug.log`, level: 'debug' }));
}
else {
  logger.add(new winston.transports.File({ filename: `log/${timeString}-error.log`, level: 'error' }));
  logger.add(new winston.transports.File({ filename: `log/${timeString}-combined.log`, level: 'info' }));
  logger.add(new winston.transports.File({ filename: `log/${timeString}-debug.log`, level: 'debug' }));
}