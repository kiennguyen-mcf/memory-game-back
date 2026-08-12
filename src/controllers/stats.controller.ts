import { StatsOverviewResponse } from '@/models/responses/stats-overview.response';
import { StatsService } from '@/services/stats.service';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Stats')
@Controller({
  path: 'stats',
  version: '1',
})
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Thống kê tổng quan (players, sessions, rewards, levels)',
  })
  @ApiOkResponse({ type: () => StatsOverviewResponse })
  async getOverview(): Promise<StatsOverviewResponse> {
    return this.statsService.getOverview();
  }
}
