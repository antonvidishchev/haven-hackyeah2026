import { Inject, Injectable } from '@nestjs/common';
import {
  GUEST_TTL_SECONDS,
  SESSION_TTL_SECONDS,
  type AuthResponse,
  type SessionPrincipal,
} from '@haven/shared';
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
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login(username: string, password: string, ip: string): Promise<AuthResponse> {
    // Per address and account: slows guessing one account without one office locking out another.
    if (!this.loginLimiter.hit(`${ip}:${username.toLowerCase()}`)) {
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
      throw apiError(401, 'invalid_credentials', 'Incorrect username or password');
    }
    const { passwordHash: _hash, ...principal } = stored;
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
