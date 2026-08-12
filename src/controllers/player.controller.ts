import { Player } from '@/models/entities/player.entity';
import { CreatePlayerRequest } from '@/models/requests/create-player.request';
import { LoginPlayerRequest } from '@/models/requests/login-player.request';
import { LoginPlayerResponse } from '@/models/responses/login-player.response';
import { PaginationDto } from '@/models/requests/pagination.request';
import { PlayerService } from '@/services/player.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Players')
@Controller({
  path: 'players',
  version: '1',
})
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo người chơi mới' })
  @ApiCreatedResponse({
    description: 'Tạo thành công, trả về userId',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '66f1a2b3c4d5e6f7a8b9c0d1' },
      },
    },
  })
  @ApiConflictResponse({
    description:
      'Email hoặc số điện thoại đã tồn tại (PlayerEmailAlreadyTaken / PlayerPhoneAlreadyTaken)',
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ (email/phone sai format)',
  })
  async createPlayer(@Body() dto: CreatePlayerRequest) {
    return this.playerService.createPlayer(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập người chơi bằng email + số điện thoại' })
  @ApiOkResponse({ type: () => LoginPlayerResponse })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người chơi (PlayerNotFound)',
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  async login(@Body() dto: LoginPlayerRequest) {
    return this.playerService.login(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách người chơi (sắp theo tổng điểm)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ type: () => Player, isArray: true })
  async getAllPlayers(@Query() query: PaginationDto) {
    return this.playerService.getAllPlayers(query.page, query.limit);
  }

  @Get('leaderboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy top người chơi theo tổng điểm' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ type: () => Player, isArray: true })
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.playerService.getLeaderboard(Number(limit ?? 10));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin người chơi theo id' })
  @ApiParam({ name: 'id', type: String, example: '66f1a2b3c4d5e6f7a8b9c0d1' })
  @ApiOkResponse({ type: () => Player })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người chơi' })
  @ApiBadRequestResponse({ description: 'Id không hợp lệ' })
  async getPlayerById(@Param('id') id: string) {
    return this.playerService.getPlayerById(id);
  }
}
