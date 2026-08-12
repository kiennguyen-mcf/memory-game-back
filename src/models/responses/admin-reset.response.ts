import { ApiProperty } from '@nestjs/swagger';

export class AdminResetResponse {
  @ApiProperty({ example: 12 })
  playersDeleted: number;

  @ApiProperty({ example: 34 })
  sessionsDeleted: number;

  @ApiProperty({ example: '2026-08-04T03:20:13.000Z' })
  timestamp: string;
}
