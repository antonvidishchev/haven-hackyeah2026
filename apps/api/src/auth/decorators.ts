import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role, SessionPrincipal } from '@haven/shared';
import type { FastifyRequest } from 'fastify';

export const IS_PUBLIC = 'haven:public';
export const ROLES = 'haven:roles';

/** No token needed. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Only these roles may call the handler (any signed-in principal when absent). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export type AuthenticatedRequest = FastifyRequest & { principal?: SessionPrincipal };

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionPrincipal => {
    const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().principal;
    if (!principal) throw new Error('CurrentPrincipal used on a public route');
    return principal;
  },
);
