import type { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role, SessionPrincipal } from '@haven/shared';
import { describe, expect, it } from 'vitest';
import type { AppConfig } from '../config/env.js';
import { assertOrganizationScope } from './access.js';
import { AuthGuard } from './auth.guard.js';
import { type AuthenticatedRequest, IS_PUBLIC, ROLES } from './decorators.js';
import { signSessionToken } from './jwt.js';

const config = { JWT_SECRET: 'test-secret-that-is-at-least-32-characters' } as AppConfig;

function contextFor(request: Partial<AuthenticatedRequest>, metadata: Record<string, unknown>) {
  const handler = () => {};
  for (const [key, value] of Object.entries(metadata)) Reflect.defineMetadata(key, value, handler);
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

async function bearer(role: Role) {
  const { token } = await signSessionToken({ id: role, role, name: role }, config.JWT_SECRET, 60);
  return { headers: { authorization: `Bearer ${token}` } } as Partial<AuthenticatedRequest>;
}

async function rejection(promise: Promise<unknown>) {
  const error = (await promise.catch((e: unknown) => e)) as HttpException;
  return { status: error.getStatus(), body: error.getResponse() };
}

const guard = new AuthGuard(new Reflector(), config);

describe('AuthGuard', () => {
  it('lets public routes through without a token', async () => {
    expect(await guard.canActivate(contextFor({ headers: {} }, { [IS_PUBLIC]: true }))).toBe(true);
  });

  it('answers 401 without a token, and for a bad one', async () => {
    expect((await rejection(guard.canActivate(contextFor({ headers: {} }, {})))).status).toBe(401);
    const bad = { headers: { authorization: 'Bearer nope' } } as Partial<AuthenticatedRequest>;
    expect((await rejection(guard.canActivate(contextFor(bad, {})))).status).toBe(401);
  });

  it('attaches the principal for a valid token', async () => {
    const request = await bearer('resident');
    expect(await guard.canActivate(contextFor(request, {}))).toBe(true);
    expect(request.principal).toMatchObject({ id: 'resident', role: 'resident' });
  });

  it('enforces roles with a message naming who is allowed', async () => {
    const operatorOnly = { [ROLES]: ['operator', 'admin'] };
    expect(await guard.canActivate(contextFor(await bearer('admin'), operatorOnly))).toBe(true);
    expect(
      await rejection(guard.canActivate(contextFor(await bearer('resident'), operatorOnly))),
    ).toEqual({
      status: 403,
      body: { error: { code: 'access_required', message: 'Operator access required' } },
    });

    const officialOnly = { [ROLES]: ['official'] };
    const denied = await rejection(
      guard.canActivate(contextFor(await bearer('operator'), officialOnly)),
    );
    expect(denied.body).toMatchObject({ error: { message: 'Official access required' } });

    const backoffice = { [ROLES]: ['operator', 'official', 'admin'] };
    const guest = await rejection(guard.canActivate(contextFor(await bearer('guest'), backoffice)));
    expect(guest.body).toMatchObject({ error: { message: 'Backoffice access required' } });
  });
});

describe('assertOrganizationScope', () => {
  const official: SessionPrincipal = {
    id: 'official-police',
    role: 'official',
    name: 'Police Liaison Official',
    organizationId: 'police_municipal',
  };

  it('allows an official in their own organisation only', () => {
    expect(() => assertOrganizationScope(official, 'police_municipal')).not.toThrow();
    expect(() => assertOrganizationScope(official, 'professional_paid')).toThrow();
  });

  it('does not scope operators', () => {
    const operator: SessionPrincipal = { id: 'operator', role: 'operator', name: 'Operator' };
    expect(() => assertOrganizationScope(operator, 'professional_paid')).not.toThrow();
  });
});
