import { ApiProperty } from '@nestjs/swagger';

export class OkResponse {
  @ApiProperty()
  success: boolean;
}
