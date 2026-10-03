import { Inject, Injectable } from '@nestjs/common';
import {
  GUEST_TTL_SECONDS,
  SESSION_TTL_SECONDS,
  type AuthResponse,
  type SessionPrincipal,
} from '@haven/shared';
import { usernameDigest } from '../audit/audit.meta.js';
import { AuditService } from '../audit/audit.service.js';
import { apiError } from '../common/http-exception.filter.js';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { signSessionToken } from './jwt.js';
import { dummyPasswordHash, verifyPassword } from './password.js';
import { PrincipalRepository } from './principal.repository.js';
import { RateLimiter } from './rate-limiter.js';

@Injectable()
export class AuthService {
  private readonly loginLimiter = new RateLimiter(20, 60_000);

  constructor(
    private readonly principals: PrincipalRepository,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login(username: string, password: string, ip: string): Promise<AuthResponse> {
    // Only failures count, so guessing is slowed but a busy office signing in is not.
    if (this.loginLimiter.blocked(ip)) {
      throw apiError(
        429,
        'too_many_attempts',
        'Too many sign-in attempts. Please wait a minute and try again.',
      );
    }
    const stored = await this.principals.findByUsername(username);
    // Same work and the same answer whether the username or the password is wrong.
    const valid = await verifyPassword(
      password,
      stored?.passwordHash ?? (await dummyPasswordHash()),
    );
    if (!stored?.passwordHash || !valid || stored.role === 'guest') {
      this.loginLimiter.hit(ip);
      await this.audit.record(null, 'auth.login_failed', null, {
        usernameDigest: usernameDigest(username, this.config.JWT_SECRET),
      });
      throw apiError(401, 'invalid_credentials', 'Incorrect username or password');
    }
    const { passwordHash: _hash, ...principal } = stored;
    await this.audit.record(principal, 'auth.login', { type: 'principal', id: principal.id });
    return this.issue(principal, SESSION_TTL_SECONDS);
  }

  async guest(): Promise<AuthResponse> {
    const { passwordHash: _hash, ...principal } = await this.principals.createGuest();
    return this.issue(principal, GUEST_TTL_SECONDS);
  }

  private async issue(principal: SessionPrincipal, ttlSeconds: number): Promise<AuthResponse> {
    const { token, expiresAt } = await signSessionToken(
      principal,
      this.config.JWT_SECRET,
      ttlSeconds,
    );
    return { token, expiresAt: expiresAt.toISOString(), principal };
  }
}
