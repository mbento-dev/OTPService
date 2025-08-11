/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('OTPController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should generate token and validate it', async () => {
    let token: string = '';
    const generateResponse = await request(app.getHttpServer())
      .get('/otp/generate')
      .set('userId', 'e2e user')
      .expect(200);

    expect(generateResponse.body).toHaveProperty('token');
    token = generateResponse.body.token;
    expect(generateResponse.body).toHaveProperty('expires');

    const validateResponse = await request(app.getHttpServer())
      .get('/otp/validate')
      .set('userId', 'e2e user')
      .set('token', token)
      .expect(200);

    expect(validateResponse.body).toStrictEqual({ sessionObject: 'TBI' });
  });
});
