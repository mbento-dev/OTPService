import { Controller, Get, Headers, Ip } from '@nestjs/common';
import { OtpService } from './otp.service';
import { ApiResponse } from '@nestjs/swagger';

@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Get('generate')
  @ApiResponse({
    status: 200,
    description: 'The record has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid/bad request' })
  generateToken(@Ip() author: string, @Headers('userId') userId: string) {
    return this.otpService.generateToken(author, userId);
  }

  @Get('validate')
  validateToken(
    @Ip() author: string,
    @Headers('token') token: string,
    @Headers('userId') userId: string,
  ) {
    return this.otpService.validateToken(author, token, userId);
  }
}
