import { GAME_SESSION_QUEUE } from '@/utils/constants';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';

export interface GameSessionEvent {
  type: 'game_session_created';
  sessionId: string;
  playerId: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class GameSessionQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(GameSessionQueueService.name);
  private readonly queue: Queue;
  private readonly worker: Worker;

  constructor(private readonly configService: ConfigService) {
    const { host, port, database, password } = this.configService.get('redis');

    const connection = {
      host,
      port,
      db: database,
      password: password || undefined,
    };

    this.queue = new Queue(GAME_SESSION_QUEUE, { connection });

    this.worker = new Worker(
      GAME_SESSION_QUEUE,
      (job: Job<GameSessionEvent>) => {
        this.logger.log(
          `Processing job ${job.id}: ${job.data.type} session ${job.data.sessionId} for player ${job.data.playerId}`,
        );
        return Promise.resolve();
      },
      { connection },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.worker.on('error', (err) => {
      this.logger.warn(`Queue worker error: ${err.message}`);
    });
  }

  async publish(event: GameSessionEvent): Promise<void> {
    await this.queue.add(event.type, event, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    });
  }

  getQueue(): Queue {
    return this.queue;
  }

  async isReady(): Promise<boolean> {
    try {
      await Promise.race([
        this.queue.waitUntilReady(),
        new Promise((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error('redis connection timeout')),
            2000,
          );
          timer.unref();
        }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}
