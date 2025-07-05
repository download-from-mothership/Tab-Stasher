import StatsD from 'hot-shots';
import { createLogger, format, transports } from 'winston';

// DogStatsD client (default host/port 8125)
export const metrics = new StatsD();

// Winston logger
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
}); 