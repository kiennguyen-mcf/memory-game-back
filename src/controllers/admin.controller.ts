import { AdminGuard } from '@/guards/admin.guard';
import { AdminLoginRequest } from '@/models/requests/admin-login.request';
import { AdminLoginResponse } from '@/models/responses/admin-login.response';
import { AdminResetResponse } from '@/models/responses/admin-reset.response';
import { UpdateInventoryRequest } from '@/models/requests/update-inventory.request';
import { UpdateWheelConfigRequest } from '@/models/requests/update-wheel-config.request';
import { AdminInventoryResponse } from '@/models/responses/reward-state.response';
import { StatsOverviewResponse } from '@/models/responses/stats-overview.response';
import { AdminAuthService } from '@/services/admin-auth.service';
import { AdminResetService } from '@/services/admin-reset.service';
import { RewardService } from '@/services/reward.service';
import { StatsService } from '@/services/stats.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
    private readonly statsService: StatsService,
    private readonly rewardService: RewardService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập admin để lấy JWT token' })
  @ApiOkResponse({ type: () => AdminLoginResponse })
  @ApiUnauthorizedResponse({ description: 'Sai username hoặc mật khẩu' })
  login(@Body() dto: AdminLoginRequest) {
    return this.adminAuthService.login(dto);
  }

  @Get('dashboard/stats')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Thống kê tổng quan cho dashboard admin' })
  @ApiOkResponse({ type: () => StatsOverviewResponse })
  @ApiUnauthorizedResponse({ description: 'Thiếu hoặc sai Bearer token' })
  getDashboardStats(): Promise<StatsOverviewResponse> {
    return this.statsService.getOverview();
  }

  @Get('rewards/inventory')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Lấy tồn kho quà + tỷ lệ trúng hiện tại' })
  @ApiOkResponse({ type: () => AdminInventoryResponse })
  @ApiUnauthorizedResponse({ description: 'Thiếu hoặc sai Bearer token' })
  getRewardsInventory(): Promise<AdminInventoryResponse> {
    return this.rewardService.getAdminInventory();
  }

  @Post('rewards/inventory')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Cập nhật tồn kho quà' })
  @ApiOkResponse({ type: () => AdminInventoryResponse })
  @ApiBadRequestResponse({ description: 'Dữ liệu inventory không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Thiếu hoặc sai Bearer token' })
  updateRewardsInventory(
    @Body() dto: UpdateInventoryRequest,
  ): Promise<AdminInventoryResponse> {
    return this.rewardService.updateInventory(dto.inventory);
  }

  @Get('rewards/wheel-config')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Lấy cấu hình vòng quay (số ô mỗi quà) + tỷ lệ trúng' })
  @ApiOkResponse({ type: () => AdminInventoryResponse })
  @ApiUnauthorizedResponse({ description: 'Thiếu hoặc sai Bearer token' })
  getWheelConfig(): Promise<AdminInventoryResponse> {
    return this.rewardService.getAdminInventory();
  }

  @Post('rewards/wheel-config')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Cập nhật cấu hình vòng quay (số ô mỗi quà). Tỷ lệ trúng = số ô quà đó / tổng số ô còn hàng' })
  @ApiOkResponse({ type: () => AdminInventoryResponse })
  @ApiBadRequestResponse({ description: 'Dữ liệu wheel config không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Thiếu hoặc sai Bearer token' })
  updateWheelConfig(
    @Body() dto: UpdateWheelConfigRequest,
  ): Promise<AdminInventoryResponse> {
    return this.rewardService.updateWheelConfig(dto);
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
