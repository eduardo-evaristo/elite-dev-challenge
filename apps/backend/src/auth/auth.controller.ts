import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  Res,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import type { Request, Response } from 'express';
import type { PublicUser, AuthenticatedUser } from './auth.types';
import JwtGuard from './guards/jwt.guard';
import LocalGuard from './guards/local.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private get cookieOptions() {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      path: '/',
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      domain: this.configService.get<string>('COOKIE_DOMAIN'),
    };
  }

  @UseGuards(LocalGuard)
  @Post('login')
  login(
    @Req() req: Request & { user: PublicUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = this.authService.login(req.user);
    res.cookie('access_token', access_token, this.cookieOptions);
    return { access_token };
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.authService.register(registerDto);
    res.cookie('access_token', access_token, this.cookieOptions);
    return { access_token };
  }

  @UseGuards(JwtGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', this.cookieOptions);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@Req() req: Request & { user: AuthenticatedUser }) {
    if (!req.user) throw new UnauthorizedException();

    return this.authService.getMe(req.user.email);
  }
}
