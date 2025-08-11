import { ApiProperty } from '@nestjs/swagger';

export class OtpTokenResponse {
  @ApiProperty()
  token: string;
  @ApiProperty()
  expires: Date;
}
