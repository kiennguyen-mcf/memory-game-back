import { parseRedisUrl } from '@/utils/helper';
import * as joi from 'joi';

export interface Configuration {
  port: number;
  isProd: boolean;
  prefix: string;
  version: string;
  frontendUrl: string;
  adminSecret: string;
  adminUsername: string;
  adminPassword: string;

  mongo: {
    uri: string;
  };
  redis: {
    url: string;
    host: string;
    port: number;
    database: number;
    password: string;
    prefix: string;
  };
  redisLock: {
    driftFactor: number;
    retryJitter: number;
    retryCount: number;
    retryDelay: number;
  };
}

const redisSchema = joi.object({
  url: joi.string().required(),
  host: joi.string().required(),
  port: joi.number().required(),
  database: joi.number().required(),
  password: joi.string().required().allow(''),
  prefix: joi.string().required(),
});

const redisLockSchema = joi.object({
  driftFactor: joi.number().required(),
  retryJitter: joi.number().required(),
  retryCount: joi.number().required(),
  retryDelay: joi.number().required(),
});

const configSchema = joi.object<Configuration>({
  port: joi.number().required(),
  isProd: joi.boolean().required(),
  prefix: joi.string().required(),
  version: joi.string().required(),
  frontendUrl: joi.string().required(),
  adminSecret: joi.string().required(),
  adminUsername: joi.string().required(),
  adminPassword: joi.string().required(),

  mongo: joi.object({ uri: joi.string().required() }).required(),
  redis: redisSchema.required(),
  redisLock: redisLockSchema.required(),
});

export const loadConfiguration = (): Configuration => {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redisParts = parseRedisUrl(redisUrl);

  const config = {
    port: Number(process.env.PORT ?? 3000),
    isProd: (process.env.NODE_ENV ?? 'development') === 'production',
    prefix: process.env.API_PREFIX ?? 'api',
    version: process.env.API_VERSION ?? '1',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    adminSecret: process.env.BETTER_AUTH_SECRET ?? 'secret',
    adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
    adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',

    mongo: {
      uri:
        process.env.MONGODB_URI ??
        'mongodb://localhost:27017/microfin-memory-game',
    },
    redis: {
      url: redisUrl,
      host: redisParts.host,
      port: redisParts.port,
      database: redisParts.database,
      password: redisParts.password,
      prefix: 'microfin-memory-game',
    },
    redisLock: {
      driftFactor: Number(process.env.REDIS_LOCK_DRIFT_FACTOR ?? 0.01),
      retryJitter: Number(process.env.REDIS_LOCK_RETRY_JITTER ?? 200),
      retryCount: Number(process.env.REDIS_LOCK_RETRY_COUNT ?? 5),
      retryDelay: Number(process.env.REDIS_LOCK_RETRY_DELAY ?? 200),
    },
  };

  const { value, error } = configSchema.validate(config, { abortEarly: true });

  if (error) {
    throw new Error(error.message);
  }

  return value;
};
