import { AdminAuthService } from '@/services/admin-auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let configService: { get: jest.Mock };

  const TOKEN_TTL_SECONDS = 86400 * 7;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          adminUsername: 'admin',
          adminPassword: 'admin123',
          adminSecret: 'secret',
        };
        return map[key];
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AdminAuthService);
  });

  describe('login', () => {
    it('should return a valid HS256 JWT with 7-day expiry for correct credentials', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = service.login({ username: 'admin', password: 'admin123' });
      const after = Math.floor(Date.now() / 1000);

      expect(result.message).toBe('Login successful');

      const [header, payload, signature] = result.token.split('.');
      expect(header).toBeTruthy();
      expect(payload).toBeTruthy();
      expect(signature).toBeTruthy();
      expect(result.token.split('.')).toHaveLength(3);

      const parsedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf-8'),
      );
      expect(parsedPayload.sub).toBe('admin');
      expect(parsedPayload.iat).toBeGreaterThanOrEqual(before);
      expect(parsedPayload.iat).toBeLessThanOrEqual(after);
      expect(parsedPayload.exp).toBe(parsedPayload.iat + TOKEN_TTL_SECONDS);
    });

    it('should throw UnauthorizedException for wrong username', () => {
      expect(() =>
        service.login({ username: 'root', password: 'admin123' }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', () => {
      expect(() =>
        service.login({ username: 'admin', password: 'wrongpass' }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for empty credentials', () => {
      expect(() => service.login({ username: '', password: '' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});
