import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@haven/shared';
import { apiError } from '../common/http-exception.filter.js';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { accessRequiredMessage } from './access.js';
import { type AuthenticatedRequest, IS_PUBLIC, ROLES } from './decorators.js';
import { verifySessionToken } from './jwt.js';

/** Global guard: every route needs a valid Bearer token unless marked `@Public()`. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw apiError(401, 'unauthenticated', 'Sign in to continue');
    }
    const principal = await verifySessionToken(token, this.config.JWT_SECRET);
    if (!principal) {
      throw apiError(401, 'session_expired', 'Your session has expired. Please sign in again.');
    }
    request.principal = principal;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(principal.role)) {
      throw apiError(403, 'access_required', accessRequiredMessage(roles));
    }
    return true;
  }
}
