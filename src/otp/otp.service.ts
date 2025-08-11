import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { OtpTokenResponse } from './dtos/otpTokenResponse.interface';
import moment from 'moment';
import { InjectRepository } from '@nestjs/typeorm';
import { OtpToken } from './otpToken.entity';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { authenticator } from 'otplib';
import { GenerateTokenPayload } from './dtos/generateTokenPayload.interface';
import { ValidateTokenPayload } from './dtos/validateTokenPayload.interface';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpToken)
    private otpTokenRepo: Repository<OtpToken>,
  ) {}
  private readonly logger = new Logger('OtpService');

  public validateGenerateTokenPayload(payload: GenerateTokenPayload) {
    this.logger.log('validating payload: ' + JSON.stringify(payload));
    const errors: Array<{ error: string }> = [];
    if (!payload.author) {
      errors.push({
        error: 'origin not found',
      });
    }
    if (!payload.userId) {
      errors.push({
        error: 'user not found',
      });
    }
    if (errors.length > 0) {
      this.logger.warn('validation failed: ' + JSON.stringify(errors));
      throw new HttpException(
        {
          error: errors.flatMap(({ error }) => error),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async generateToken(
    payload: GenerateTokenPayload,
  ): Promise<OtpTokenResponse> {
    this.logger.log('generating token for user: ' + payload.userId);
    this.validateGenerateTokenPayload(payload);
    const tokenResponse: OtpTokenResponse = new OtpTokenResponse();

    const expiresAt: Date = moment()
      .add(process.env.EXPIRATION_TIME_IN_SECONDS, 's')
      .toDate();

    const secret = payload.userId + expiresAt.toTimeString();

    const otp = await this.otpTokenRepo.save({
      token: authenticator.generate(secret),
      userId: payload.userId,
      createdBy: payload.author,
      expiresAt: expiresAt,
    });

    tokenResponse.token = otp.token;
    tokenResponse.expires = otp.expiresAt;

    return tokenResponse;
  }

  private validateValidateTokenPayload(payload: ValidateTokenPayload) {
    this.logger.log('validating payload: ' + JSON.stringify(payload));
    const errors: Array<{ error: string }> = [];
    if (!payload.author) {
      errors.push({
        error: 'origin not found',
      });
    }
    if (!payload.userId) {
      errors.push({
        error: 'user not found',
      });
    }
    if (!payload.token) {
      errors.push({
        error: 'token not found',
      });
    }
    if (errors.length > 0) {
      this.logger.warn('validation failed: ' + JSON.stringify(errors));
      throw new HttpException(
        {
          error: errors.flatMap(({ error }) => error),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async validateToken(payload: ValidateTokenPayload) {
    this.logger.log(
      'validating token: ' + payload.token + ' for user:' + payload.userId,
    );
    this.validateValidateTokenPayload(payload);

    const otp = await this.otpTokenRepo.findOne({
      where: {
        userId: payload.userId,
        token: payload.token,
        expiresAt: MoreThan(moment().toDate()),
        usedAt: IsNull(),
      },
    });

    if (!otp)
      throw new HttpException(
        { error: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );

    this.logger.log('consuming token');

    otp.usedAt = moment().toDate();
    otp.usedBy = payload.author;

    this.logger.log('token consumed');

    await this.otpTokenRepo.save(otp);

    return { sessionObject: 'TBI' };
  }
}
