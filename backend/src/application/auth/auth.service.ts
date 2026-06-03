import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../infra/prisma/prisma.service'
import type {
  AuthResponseDto,
  AuthUserDto,
  LoginDto,
  RegisterDto,
} from '../../contracts/dto/auth.dto'

/* Email+password auth. Access token (short) + refresh token (long), both JWTs
   signed with separate secrets. Stateless logout — the SPA discards its stored
   tokens (no server-side blacklist in MVP). Refresh rotates both tokens. */

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m'
const REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '30d'
const ACCESS_SECRET = process.env.JWT_SECRET ?? 'gemspot-dev-access-secret'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'gemspot-dev-refresh-secret'

interface RefreshClaims {
  sub: string
  typ: 'refresh'
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const email = input.email.toLowerCase().trim()
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictException('Email already registered')

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: { name: input.name?.trim() || null } },
      },
      include: { profile: true },
    })
    return this.session(user.id, user.email, user.role, user.profile?.name ?? null)
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const email = input.email.toLowerCase().trim()
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    })
    if (!user) throw new UnauthorizedException('Invalid email or password')
    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid email or password')
    return this.session(user.id, user.email, user.role, user.profile?.name ?? null)
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let claims: RefreshClaims
    try {
      claims = await this.jwt.verifyAsync<RefreshClaims>(refreshToken, {
        secret: REFRESH_SECRET,
      })
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
    if (claims.typ !== 'refresh') throw new UnauthorizedException('Invalid refresh token')
    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: { profile: true },
    })
    if (!user) throw new UnauthorizedException('Invalid refresh token')
    return this.session(user.id, user.email, user.role, user.profile?.name ?? null)
  }

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })
    if (!user) throw new UnauthorizedException('Account not found')
    return {
      id: user.id,
      email: user.email,
      name: user.profile?.name ?? null,
      role: user.role,
    }
  }

  private async session(
    id: string,
    email: string,
    role: 'CLIENT' | 'ADMIN',
    name: string | null,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.jwt.signAsync(
      { sub: id, email, role },
      { secret: ACCESS_SECRET, expiresIn: ACCESS_TTL },
    )
    const refreshToken = await this.jwt.signAsync(
      { sub: id, typ: 'refresh' },
      { secret: REFRESH_SECRET, expiresIn: REFRESH_TTL },
    )
    return { user: { id, email, name, role }, accessToken, refreshToken }
  }
}
