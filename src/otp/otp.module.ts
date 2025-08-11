import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpToken } from './otpToken.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OtpToken])],
  controllers: [OtpController],
  providers: [OtpService],
})
export class OtpModule {}
