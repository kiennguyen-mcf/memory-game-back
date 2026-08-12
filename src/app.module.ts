import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { loadConfiguration } from './configs/app.config';
import { AppController } from './controllers/app.controller';
import { AdminController } from './controllers/admin.controller';
import { GameSessionController } from './controllers/game-session.controller';
import { PlayerController } from './controllers/player.controller';
import { StatsController } from './controllers/stats.controller';
import { AppClassSerializerInterceptor } from './interceptors/mongo-class-serializer.interceptor';
import {
  GameSession,
  GameSessionSchema,
} from './models/entities/game-session.entity';
import { Player, PlayerSchema } from './models/entities/player.entity';
import { GameSessionsRepository } from './models/repos/game-session.repo';
import { PlayersRepository } from './models/repos/player.repo';
import { AdminResetService } from './services/admin-reset.service';
import { AdminAuthService } from './services/admin-auth.service';
import { CacheDomain } from './services/cache.service';
import { GameSessionQueueService } from './services/game-session-queue.service';
import { GameSessionService } from './services/game-session.service';
import { PlayerService } from './services/player.service';
import { StatsService } from './services/stats.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [() => loadConfiguration()],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { uri } = configService.get('mongo');
        return { uri };
      },
    }),

    MongooseModule.forFeature([
      {
        name: Player.name,
        schema: PlayerSchema,
      },
      {
        name: GameSession.name,
        schema: GameSessionSchema,
      },
    ]),
  ],
  controllers: [
    AppController,
    AdminController,
    PlayerController,
    GameSessionController,
    StatsController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AppClassSerializerInterceptor },

    // * services
    AdminResetService,
    AdminAuthService,
    CacheDomain,
    PlayerService,
    GameSessionService,
    GameSessionQueueService,
    StatsService,

    // * repos
    PlayersRepository,
    GameSessionsRepository,
  ],
})
export class AppModule {}
