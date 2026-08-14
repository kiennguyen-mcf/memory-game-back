import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FoodRequest } from '@/models/requests/food.request';
import { SpinRequest } from '@/models/requests/spin.request';
import {
  FoodResponse,
  GauResponse,
  RewardStateResponse,
  SpinResponse,
} from '@/models/responses/reward-state.response';
import { RewardService } from '@/services/reward.service';

@ApiTags('Rewards')
@Controller({
  path: 'rewards',
  version: '1',
})
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy trạng thái quà (claim + tồn kho) của người chơi',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    example: '66f1a2b3c4d5e6f7a8b9c0d1',
  })
  @ApiOkResponse({ type: () => RewardStateResponse })
  @ApiBadRequestResponse({ description: 'Thiếu userId' })
  getState(@Query('userId') userId: string): Promise<RewardStateResponse> {
    return this.rewardService.getRewardState(userId);
  }

  @Post('spin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quay vòng quay may mắn' })
  @ApiOkResponse({ type: () => SpinResponse })
  @ApiBadRequestResponse({ description: 'Thiếu playerId' })
  @ApiConflictResponse({
    description: 'Đã quay rồi (already-spun) hoặc hết quà (all-out-of-stock)',
  })
  spin(@Body() dto: SpinRequest): Promise<SpinResponse> {
    return this.rewardService.spin(dto.playerId);
  }

  @Post('gau')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhận gấu bông chắc chắn (tier 600 điểm) trước khi quay',
  })
  @ApiOkResponse({ type: () => GauResponse })
  @ApiBadRequestResponse({ description: 'Thiếu playerId' })
  @ApiConflictResponse({
    description: 'Đã nhận rồi (already-granted) hoặc hết hàng (out-of-stock)',
  })
  grantGau(@Body() dto: SpinRequest): Promise<GauResponse> {
    return this.rewardService.grantGau(dto.playerId);
  }

  @Post('food')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhận phần quà đồ ăn (tier dưới 300 điểm)' })
  @ApiOkResponse({ type: () => FoodResponse })
  @ApiBadRequestResponse({ description: 'Thiếu playerId' })
  food(@Body() dto: FoodRequest): Promise<FoodResponse> {
    return this.rewardService.claimFood(dto.playerId);
  }
}
