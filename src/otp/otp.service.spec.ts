/* eslint-disable @typescript-eslint/no-unsafe-return */
// Ignoring unsafe calls for tests
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpToken } from './otpToken.entity';
import { IsNull, Repository } from 'typeorm';
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
      const result = await service.generateToken(mockAuthor, mockUserId);

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
      await expect(service.generateToken('', mockUserId)).rejects.toThrow(
        HttpException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw HttpException with correct error messages', async () => {
      try {
        await service.generateToken('', '');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getResponse()).toEqual({
          error: ['origin not found'],
        });
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should create token with correct expiration time', async () => {
      const result = await service.generateToken(mockAuthor, mockUserId);

      const now = moment().toDate();

      expect(result.expires.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('validateToken', () => {
    const mockAuthor = '127.0.0.1';
    const mockToken = '123456';
    const mockUserId = 'user123';
    const mockDate = new Date();
    const mockValidOtp = {
      id: 'uuid',
      token: mockToken,
      userId: mockUserId,
      createdBy: mockAuthor,
      expiresAt: new Date(Date.now() + 300000), // 5~ minutes from now
      createdAt: mockDate,
      usedAt: null,
      usedBy: null,
    };

    beforeEach(() => {
      jest.spyOn(authenticator, 'generate').mockReturnValue(mockToken);

      mockRepository.save.mockImplementation(({ expiresAt }) => ({
        id: 'some-uuid',
        token: mockToken,
        userId: mockUserId,
        createdBy: mockAuthor,
        expiresAt,
        createdAt: mockDate,
      }));
    });

    it('should throw error when author is missing', async () => {
      await expect(
        service.validateToken('', mockToken, mockUserId),
      ).rejects.toThrow(
        new HttpException(
          { error: 'origin not found' },
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw unauthorized when token not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateToken(mockAuthor, mockToken, mockUserId),
      ).rejects.toThrow(
        new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED),
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          token: mockToken,
          expiresAt: expect.any(Object),
          usedAt: IsNull(),
        },
      });
    });

    it('should successfully validate and update token', async () => {
      mockRepository.findOne.mockResolvedValue(mockValidOtp);
      mockRepository.save.mockImplementation(async (entity) => await entity);

      const result = await service.validateToken(
        mockAuthor,
        mockToken,
        mockUserId,
      );

      expect(result).toEqual({ sessionObject: 'TBI' });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          token: mockToken,
          expiresAt: expect.any(Object), // MoreThan check
          usedAt: IsNull(),
        },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockValidOtp,
          usedAt: expect.any(Date),
          usedBy: mockAuthor,
        }),
      );
    });

    it('should update usedAt and usedBy when validating token', async () => {
      mockRepository.findOne.mockResolvedValue(mockValidOtp);
      mockRepository.save.mockImplementation(async (entity) => await entity);

      await service.validateToken(mockAuthor, mockToken, mockUserId);

      const savedToken = mockRepository.save.mock.calls[0][0];
      expect(savedToken.usedAt).toBeDefined();
      expect(savedToken.usedBy).toBe(mockAuthor);
    });

    it('should throw unauthorized when token is expired', async () => {
      mockRepository.findOne.mockResolvedValue(null); // Returning null because of MoreThan clause

      await expect(
        service.validateToken(mockAuthor, mockToken, mockUserId),
      ).rejects.toThrow(
        new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED),
      );
    });

    it('should throw unauthorized when token is already used', async () => {
      mockRepository.findOne.mockResolvedValue(null); // Returning null because usedAt is not null

      await expect(
        service.validateToken(mockAuthor, mockToken, mockUserId),
      ).rejects.toThrow(
        new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED),
      );
    });
  });
});
