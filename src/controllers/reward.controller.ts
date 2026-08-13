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
import { PickRequest } from '@/models/requests/pick.request';
import { SpinRequest } from '@/models/requests/spin.request';
import {
  FoodResponse,
  PickResponse,
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

  @Post('pick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chọn quà (tier ≥ 600 điểm)' })
  @ApiOkResponse({ type: () => PickResponse })
  @ApiBadRequestResponse({
    description:
      'Thiếu dữ liệu, gift không hợp lệ, hoặc chưa quay (spin-first)',
  })
  @ApiConflictResponse({
    description: 'Đã chọn rồi (already-picked) hoặc hết hàng (out-of-stock)',
  })
  pick(@Body() dto: PickRequest): Promise<PickResponse> {
    return this.rewardService.pick(dto.playerId, dto.gift);
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
