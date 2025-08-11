// Ignoring unsafe calls for tests
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpToken } from './otpToken.entity';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { authenticator } from 'otplib';
import moment from 'moment';

describe('OtpService', () => {
  let service: OtpService;
  let repository: Repository<OtpToken>;

  // Mock repository
  const mockRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getRepositoryToken(OtpToken),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    repository = module.get<Repository<OtpToken>>(getRepositoryToken(OtpToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GenerateToken', () => {
    const mockAuthor = '127.0.0.1';
    const mockUserId = 'user123';
    const mockToken = '123456';
    const mockDate = new Date();

    beforeEach(() => {
      // Mock the authenticator.generate method
      jest.spyOn(authenticator, 'generate').mockReturnValue(mockToken);

      // Mock the repository save method
      mockRepository.save.mockImplementation(({ expiresAt }) => ({
        id: 'some-uuid',
        token: mockToken,
        userId: mockUserId,
        createdBy: mockAuthor,
        expiresAt,
        createdAt: mockDate,
      }));
    });

    it('should generate an OTP token successfully', async () => {
      const result = await service.GenerateToken(mockAuthor, mockUserId);

      expect(result).toBeDefined();
      expect(result.token).toBe(mockToken);
      expect(result.expires).toBeDefined();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          token: mockToken,
          userId: mockUserId,
          createdBy: mockAuthor,
        }),
      );
    });

    it('should throw HttpException if author is not provided', async () => {
      await expect(service.GenerateToken('', mockUserId)).rejects.toThrow(
        HttpException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw HttpException with correct error messages', async () => {
      try {
        await service.GenerateToken('', '');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getResponse()).toEqual({
          error: ['origin not found'],
        });
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should create token with correct expiration time', async () => {
      const result = await service.GenerateToken(mockAuthor, mockUserId);

      const now = moment().toDate();

      expect(result.expires).toBeGreaterThan(now.getTime());
    });
  });
});
