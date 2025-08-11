import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OtpTokenResponse } from './dtos/otp-token.interface';
import moment from 'moment';
import { InjectRepository } from '@nestjs/typeorm';
import { OtpToken } from './otpToken.entity';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpToken)
    private otpTokenRepo: Repository<OtpToken>,
  ) {}
  private validateGenerateToken(author: string) {
    const errors: Array<{ error: string }> = [];
    if (!author) {
      errors.push({
        error: 'origin not found',
      });
    }
    if (errors.length > 0) {
      throw new HttpException(
        {
          error: errors.flatMap(({ error }) => error),
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: 'user param is required',
        },
      );
    }
  }

  async GenerateToken(
    author: string,
    userId: string,
  ): Promise<OtpTokenResponse> {
    this.validateGenerateToken(author);
    const tokenResponse: OtpTokenResponse = new OtpTokenResponse();

    const expiresAt: Date = moment().add(5, 'm').toDate();
    console.log('EXPIRES AT', expiresAt);

    const secret = userId + expiresAt.toTimeString();

    const otp = await this.otpTokenRepo.save({
      token: authenticator.generate(secret),
      userId,
      createdBy: author,
      expiresAt: expiresAt.getTime(),
    });

    tokenResponse.token = otp.token;
    tokenResponse.expires = otp.expiresAt;

    return tokenResponse;
  }
}
