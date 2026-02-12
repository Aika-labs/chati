import pino, { type LoggerOptions } from 'pino';
import { env } from '../../config/env.js';

const options: LoggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
};

if (env.NODE_ENV === 'development') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(options);

// Child logger factory for modules
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
