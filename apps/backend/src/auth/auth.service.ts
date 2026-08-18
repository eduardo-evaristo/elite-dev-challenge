import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import type { User, PublicUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<PublicUser | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async register(registerDto: RegisterDto) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.login(user);
  }

  login(user: PublicUser) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getMe(email: string): Promise<PublicUser> {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new NotFoundException('User not found');

    const { password, ...result } = user;
    return result;
  }
}
