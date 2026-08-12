import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginResponse {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiJ9.signature',
  })
  token: string;

  @ApiProperty({ example: 'Login successful' })
  message: string;
}
