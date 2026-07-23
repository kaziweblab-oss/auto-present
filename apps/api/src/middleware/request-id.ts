import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[a-zA-Z0-9._-]{1,128}$/;

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const receivedId = request.header(REQUEST_ID_HEADER);
  request.requestId = receivedId && SAFE_REQUEST_ID.test(receivedId) ? receivedId : randomUUID();
  response.setHeader(REQUEST_ID_HEADER, request.requestId);
  next();
}
