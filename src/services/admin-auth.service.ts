import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { AdminLoginRequest } from '@/models/requests/admin-login.request';
import { AdminLoginResponse } from '@/models/responses/admin-login.response';
import { Injectable, UnauthorizedException } from '@nestjs/common';

const TOKEN_TTL_SECONDS = 86400 * 7;

@Injectable()
export class AdminAuthService {
  constructor(private readonly configService: ConfigService) {}

  login(dto: AdminLoginRequest): AdminLoginResponse {
    const expectedUsername = this.configService.get<string>('adminUsername');
    const expectedPassword = this.configService.get<string>('adminPassword');

    if (
      dto.username !== expectedUsername ||
      dto.password !== expectedPassword
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const secret = this.configService.get<string>('adminSecret') ?? 'secret';
    const now = Math.floor(Date.now() / 1000);

    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'admin',
        iat: now,
        exp: now + TOKEN_TTL_SECONDS,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return {
      token: `${header}.${payload}.${signature}`,
      message: 'Login successful',
    };
  }
}
