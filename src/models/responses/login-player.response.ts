import { ApiProperty } from '@nestjs/swagger';

export class LoginPlayerResponse {
  @ApiProperty({ example: '66f1a2b3c4d5e6f7a8b9c0d1' })
  userId: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  name: string;

  @ApiProperty({ example: 'a@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: '0901234567' })
  phone: string;

  @ApiProperty({ example: 600 })
  totalPoints: number;

  @ApiProperty({ example: 3 })
  bestLevel: number;

  @ApiProperty({ example: 4 })
  gamesPlayed: number;

  @ApiProperty({ example: 2 })
  gamesWon: number;

  @ApiProperty({ example: true })
  canContinue: boolean;

  @ApiProperty({ example: 3, nullable: true })
  nextLevel: number | null;
}
