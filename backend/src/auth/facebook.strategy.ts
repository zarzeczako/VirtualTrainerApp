import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = configService.get<string>('FACEBOOK_CLIENT_SECRET');

    // If env vars are missing, register the strategy with placeholders so the app still boots.
    const isConfigured = Boolean(clientID && clientSecret);

    super({
      clientID: clientID || 'facebook-disabled',
      clientSecret: clientSecret || 'facebook-disabled',
      callbackURL:
        configService.get<string>('FACEBOOK_CALLBACK_URL') ||
        'http://localhost:3000/api/auth/facebook/callback',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      enableProof: true,
    });

    this.enabled = isConfigured;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: unknown, info?: unknown) => void,
  ): Promise<void> {
    if (!this.enabled) {
      return done(new UnauthorizedException('Facebook login is disabled (missing env config)'));
    }

    const email = profile.emails?.[0]?.value;

    if (!email) {
      return done(new UnauthorizedException('Facebook account has no email')); // email required to link/create account
    }

    const firstName = (profile.name && profile.name.givenName) || undefined;
    const lastName = (profile.name && profile.name.familyName) || undefined;
    const avatarUrl = profile.photos?.[0]?.value;

    const user = {
      provider: 'facebook',
      providerId: profile.id,
      email,
      firstName,
      lastName,
      avatarUrl,
    };

    done(null, user);
  }
}