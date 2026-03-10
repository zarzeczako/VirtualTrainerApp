import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/schema/user.schema';

interface JwtPayload {
  sub: string;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'default_secret_for_dev',
    });
  }

  // validate should return something serializable and typed for request.user
  async validate(
    payload: JwtPayload,
  ): Promise<{ userId: string; email?: string } & Partial<User>> {
    const user = await this.usersService.findByIdSafe(String(payload.sub));
    return { userId: payload.sub, email: payload.email, ...(user || {}) };
  }
}
