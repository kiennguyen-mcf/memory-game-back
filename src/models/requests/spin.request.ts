import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SpinRequest {
  @ApiProperty({ example: '66f1a2b3c4d5e6f7a8b9c0d1' })
  @IsString()
  @IsNotEmpty()
  playerId: string;
}
