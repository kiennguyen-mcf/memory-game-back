export enum RedisKey {
  // * locking
  PLAYER_LOCKING = 'player-locking',
  GAME_SESSION_LOCKING = 'game-session-locking',

  // * cache
  LEADERBOARD = 'leaderboard',
  SESSIONS = 'sessions',
}
