import { AdminGuard } from '@/guards/admin.guard';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { ExecutionContext } from '@nestjs/common';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'secret') },
        },
      ],
    }).compile();

    guard = moduleRef.get(AdminGuard);
  });

  function buildContext(authorization?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization } }),
      }),
    } as unknown as ExecutionContext;
  }

  function signToken(header: string, payload: string): string {
    const signature = createHmac('sha256', 'secret')
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  it('should reject when Authorization header is missing', () => {
    expect(() => guard.canActivate(buildContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject when header is not Bearer', () => {
    expect(() => guard.canActivate(buildContext('Basic abc123'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a malformed token with wrong segment count', () => {
    expect(() => guard.canActivate(buildContext('Bearer a.b'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a token with a wrong signature', () => {
    const token = signToken('header', 'payload');
    const tampered = `${token.slice(0, -4)}AAAA`;

    expect(() => guard.canActivate(buildContext(`Bearer ${tampered}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a token signed with a different secret', () => {
    const header = Buffer.from('{"alg":"HS256"}').toString('base64url');
    const payload = Buffer.from('{"sub":"admin"}').toString('base64url');
    const wrongSignature = createHmac('sha256', 'other-secret')
      .update(`${header}.${payload}`)
      .digest('base64url');

    expect(() =>
      guard.canActivate(
        buildContext(`Bearer ${header}.${payload}.${wrongSignature}`),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('should allow a valid signed token', () => {
    const header = Buffer.from('{"alg":"HS256"}').toString('base64url');
    const payload = Buffer.from('{"sub":"admin"}').toString('base64url');
    const token = signToken(header, payload);

    expect(guard.canActivate(buildContext(`Bearer ${token}`))).toBe(true);
  });
});
