import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OtpTokenResponse } from './dtos/otp-token-response.interface';
import moment from 'moment';
import { InjectRepository } from '@nestjs/typeorm';
import { OtpToken } from './otpToken.entity';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { authenticator } from 'otplib';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpToken)
    private otpTokenRepo: Repository<OtpToken>,
  ) {}
  private validateAuthor(author: string) {
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
      );
    }
  }

  async generateToken(
    author: string,
    userId: string,
  ): Promise<OtpTokenResponse> {
    console.log();
    this.validateAuthor(author);
    const tokenResponse: OtpTokenResponse = new OtpTokenResponse();

    const expiresAt: Date = moment().add(5, 'm').toDate();

    const secret = userId + expiresAt.toTimeString();

    const otp = await this.otpTokenRepo.save({
      token: authenticator.generate(secret),
      userId,
      createdBy: author,
      expiresAt: expiresAt,
    });

    tokenResponse.token = otp.token;
    tokenResponse.expires = otp.expiresAt;

    return tokenResponse;
  }

  async validateToken(author: string, token: string, userId: string) {
    this.validateAuthor(author);

    const otp = await this.otpTokenRepo.findOne({
      where: {
        userId,
        token,
        expiresAt: MoreThan(moment().toDate()),
        usedAt: IsNull(),
      },
    });

    if (!otp)
      throw new HttpException(
        { error: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );

    otp.usedAt = moment().toDate();
    otp.usedBy = author;

    await this.otpTokenRepo.save(otp);

    return { sessionObject: 'TBI' };
  }
}
