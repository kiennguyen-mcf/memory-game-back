import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmptyObject,
  IsObject,
  Min,
  ValidateNested,
} from 'class-validator';

export class InventoryUpdate {
  @ApiProperty({ example: 60, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odu: number;

  @ApiProperty({ example: 108, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gau: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  v10: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  v15: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  v20: number;
}

export class UpdateInventoryRequest {
  @ApiProperty({
    example: { odu: 60, gau: 108, v10: 100, v15: 100, v20: 100 },
    type: InventoryUpdate,
  })
  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => InventoryUpdate)
  inventory: InventoryUpdate;
}
