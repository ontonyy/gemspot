import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common'
import { AuthService } from '../../application/auth/auth.service'
import {
  GoogleOAuthDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  type AuthResponseDto,
  type AuthUserDto,
} from '../../contracts/dto/auth.dto'
import { CurrentUser, JwtAuthGuard, type AuthUser } from './jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(input)
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(input)
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() input: RefreshDto): Promise<AuthResponseDto> {
    return this.auth.refresh(input.refreshToken)
  }

  @Post('oauth/google')
  @HttpCode(200)
  oauthGoogle(@Body() input: GoogleOAuthDto): Promise<AuthResponseDto> {
    return this.auth.oauthGoogle(input.idToken)
  }

  // Stateless logout — the SPA discards its tokens. Endpoint exists for parity
  // and future server-side revocation.
  @Post('logout')
  @HttpCode(200)
  logout(): { ok: true } {
    return { ok: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): Promise<AuthUserDto> {
    return this.auth.me(user.id)
  }
}
