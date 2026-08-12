import { HealthResponse } from '@/models/responses/health.response';
import { CacheDomain } from '@/services/cache.service';
import { GameSessionQueueService } from '@/services/game-session-queue.service';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';

@ApiTags('App')
@Controller({
  path: '',
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly cacheService: CacheDomain,
    private readonly gameSessionQueueService: GameSessionQueueService,
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra trạng thái hệ thống' })
  @ApiOkResponse({ type: () => HealthResponse })
  async getHealth(): Promise<HealthResponse> {
    return {
      status: 'ok',
      service: 'microfin-memory-game-back',
      timestamp: new Date().toISOString(),
      mongo: this.getMongoStatus(),
      redis: this.cacheService.getRedisClient().status === 'ready',
      queue: await this.gameSessionQueueService.isReady(),
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lời chào' })
  @ApiOkResponse({ schema: { type: 'string', example: 'Hello World!' } })
  getHello() {
    return 'Hello World!';
  }

  private getMongoStatus(): string {
    const states: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[this.connection.readyState] ?? 'unknown';
  }
}
