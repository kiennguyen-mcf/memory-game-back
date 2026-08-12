export enum ErrorDictionary {
  INTERNAL_SERVER_ERROR = 'InternalServerError',
  NOT_FOUND = 'NotFound',
  FORBIDDEN = 'Forbidden',
  BAD_REQUEST = 'BadRequest',
  UNAUTHORIZED = 'Unauthorized',

  // * player
  PLAYER_NOT_FOUND = 'PlayerNotFound',
  PLAYER_EMAIL_TAKEN = 'PlayerEmailAlreadyTaken',
  PLAYER_PHONE_TAKEN = 'PlayerPhoneAlreadyTaken',
  INVALID_PLAYER_ID = 'InvalidPlayerId',

  // * session
  SESSION_NOT_FOUND = 'SessionNotFound',
}
