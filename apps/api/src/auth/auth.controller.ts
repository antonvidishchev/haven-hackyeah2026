import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { loginRequestSchema, type LoginRequest, type SessionPrincipal } from '@haven/shared';
import type { FastifyRequest } from 'fastify';
import { ZodPipe } from '../common/zod.pipe.js';
import { AuthService } from './auth.service.js';
import { CurrentPrincipal, Public } from './decorators.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  login(@Body(new ZodPipe(loginRequestSchema)) body: LoginRequest, @Req() request: FastifyRequest) {
    return this.auth.login(body.username, body.password, request.ip);
  }

  @Public()
  @Post('auth/guest')
  @HttpCode(201)
  guest() {
    return this.auth.guest();
  }

  /** Tokens are stateless; the client forgets its token. */
  @Public()
  @Post('auth/logout')
  @HttpCode(204)
  logout() {}

  @Get('session')
  session(@CurrentPrincipal() principal: SessionPrincipal) {
    return { principal };
  }
}
