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
  @ApiProperty({ example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ao: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tui: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odu: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gau: number;
}

export class UpdateInventoryRequest {
  @ApiProperty({
    example: { ao: 100, tui: 100, odu: 100, gau: 100 },
    type: InventoryUpdate,
  })
  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => InventoryUpdate)
  inventory: InventoryUpdate;
}
