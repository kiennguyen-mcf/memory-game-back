import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateWheelConfigRequest {
  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  odu?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  gau?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  v10?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  v15?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  v20?: number;
}
