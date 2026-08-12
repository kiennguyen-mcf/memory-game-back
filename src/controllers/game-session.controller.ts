import { GameSession } from '@/models/entities/game-session.entity';
import { CreateSessionRequest } from '@/models/requests/create-session.request';
import { PaginationDto } from '@/models/requests/pagination.request';
import { GameSessionService } from '@/services/game-session.service';
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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Game Sessions')
@Controller({
  path: 'sessions',
  version: '1',
})
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Báo cáo một phiên chơi (thắng/thua)' })
  @ApiCreatedResponse({ type: () => GameSession })
  @ApiBadRequestResponse({
    description: 'PlayerId không hợp lệ hoặc thiếu dữ liệu',
  })
  @ApiNotFoundResponse({ description: 'Người chơi không tồn tại' })
  async createSession(@Body() dto: CreateSessionRequest) {
    return this.gameSessionService.createSession(dto);
  }

  @Get('player/:playerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách phiên chơi của một người chơi' })
  @ApiParam({
    name: 'playerId',
    type: String,
    example: '66f1a2b3c4d5e6f7a8b9c0d1',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ type: () => GameSession, isArray: true })
  @ApiBadRequestResponse({ description: 'PlayerId không hợp lệ' })
  async getSessionsByPlayer(
    @Param('playerId') playerId: string,
    @Query() query: PaginationDto,
  ) {
    return this.gameSessionService.getSessionsByPlayer(
      playerId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin phiên chơi theo id' })
  @ApiParam({ name: 'id', type: String, example: '66f1a2b3c4d5e6f7a8b9c0d1' })
  @ApiOkResponse({ type: () => GameSession })
  @ApiNotFoundResponse({ description: 'Không tìm thấy phiên chơi' })
  @ApiBadRequestResponse({ description: 'Id không hợp lệ' })
  async getSessionById(@Param('id') id: string) {
    return this.gameSessionService.getSessionById(id);
  }
}
