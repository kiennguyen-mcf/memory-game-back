import { ApiProperty } from '@nestjs/swagger';

export class HealthResponse {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'microfin-memory-game-back' })
  service: string;

  @ApiProperty({ example: '2026-08-04T03:20:13.000Z' })
  timestamp: string;

  @ApiProperty({ example: 'connected' })
  mongo: string;

  @ApiProperty({ example: true })
  redis: boolean;

  @ApiProperty({ example: true })
  queue: boolean;
}
