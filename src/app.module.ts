import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OtpModule } from './otp/otp.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpToken } from './otp/otpToken.entity';

@Module({
  imports: [
    OtpModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: 'otp',
      entities: [OtpToken],
      synchronize: !!process.env.POSTGRES_SYNCRHONIZE,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
