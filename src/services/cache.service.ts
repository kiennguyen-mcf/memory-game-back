import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import Redlock from 'redlock';

@Injectable()
export class CacheDomain {
  logger = new Logger(CacheDomain.name);

  private redisClients: Redis;
  private redisLockClient: Redlock;

  constructor(private readonly configService: ConfigService) {
    const { host, port, database, password } = this.configService.get('redis');

    this.redisClients = new Redis({ host, port, db: database, password });

    this.redisClients.on('connect', () =>
      this.logger.log('Connected to Redis'),
    );
    this.redisClients.on('error', (err) =>
      this.logger.error('Redis Error:', err),
    );

    this.redisLockClient = new Redlock([this.redisClients], {
      driftFactor: this.configService.get<number>('redisLock.driftFactor'),
      retryJitter: this.configService.get<number>('redisLock.retryJitter'),
    });
  }

  getRedisClient() {
    return this.redisClients;
  }

  getLockClient() {
    return this.redisLockClient;
  }

  async withLock<T>(
    keys: string[],
    ttl: number,
    fn: () => Promise<T>,
    isRetry = true,
  ): Promise<T> {
    const lockTtl = (ttl || 10) * 1000;

    const lockKeys = keys.map((key) => `microfin:lock:${key}`);

    let lock;
    try {
      lock = await this.redisLockClient.acquire(lockKeys, lockTtl, {
        ...(isRetry
          ? {
              retryCount: this.configService.get<number>(
                'redisLock.retryCount',
              ),
              retryDelay: this.configService.get<number>(
                'redisLock.retryDelay',
              ),
            }
          : { retryCount: 0, retryDelay: 0 }),
      });
    } catch (error) {
      this.logger.error(`Failed to acquire lock for ${keys}`, error);
      throw new Error(`Cannot acquire lock for ${keys}`);
    }

    const extendInterval = lockTtl / 3;
    const intervalId = setInterval(() => {
      void lock
        .extend(lockTtl)
        .then(() => this.logger.log(`Extended lock for ${keys}`))
        .catch((error) => {
          this.logger.error(`Failed to extend lock for ${keys}`, error);
          clearInterval(intervalId);
        });
    }, extendInterval);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      this.logger.log('e: ', err);
      throw err;
    } finally {
      clearInterval(intervalId);

      if (lock) {
        await lock
          .release()
          .catch((err) =>
            this.logger.error(`Failed to release lock for ${keys}`, err),
          );
        this.logger.log(`Released lock for ${keys}`);
      }
    }
  }

  withLockNoRetry<T>(keys: string[], ttl: number, fn: () => Promise<T>) {
    return this.withLock(keys, ttl, fn, false);
  }

  async createEmptySet(key: string) {
    await this.getRedisClient().sadd(key, '1');
    await this.getRedisClient().srem(key, '1');
  }
}
