import { Request } from 'express';

export type AppRequest = Request & {
  currentUserId: string;
  skipVerification: boolean;
};
