import { AdminGuard } from '@/guards/admin.guard';
import { AdminLoginRequest } from '@/models/requests/admin-login.request';
import { AdminLoginResponse } from '@/models/responses/admin-login.response';
import { AdminResetResponse } from '@/models/responses/admin-reset.response';
import { AdminAuthService } from '@/services/admin-auth.service';
import { AdminResetService } from '@/services/admin-reset.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Admin')
@Controller({
  path: 'admin',
  version: '1',
})
export class AdminController {
  constructor(
    private readonly adminResetService: AdminResetService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập admin để lấy JWT token' })
  @ApiOkResponse({ type: () => AdminLoginResponse })
  @ApiUnauthorizedResponse({ description: 'Sai username hoặc mật khẩu' })
  login(@Body() dto: AdminLoginRequest) {
    return this.adminAuthService.login(dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Reset toàn bộ dữ liệu DB (players + sessions)' })
  @ApiOkResponse({ type: () => AdminResetResponse })
  @ApiUnauthorizedResponse({ description: 'Thiếu hoặc sai Bearer token' })
  resetDatabase() {
    return this.adminResetService.resetDatabase();
  }
}
