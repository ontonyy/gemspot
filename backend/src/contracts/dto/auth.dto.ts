import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/* Auth wire contract. Mirrors web/src/shared/store/authStore.ts expectations:
   register/login return { user, accessToken, refreshToken }; /auth/me returns the
   user; /auth/refresh rotates both tokens. Tokens are JWTs the SPA stores in
   localStorage (zustand persist) and sends as `Authorization: Bearer <access>`. */

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt input ceiling
  password!: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(1)
  password!: string
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string
}

export interface AuthUserDto {
  id: string
  email: string
  name: string | null
  role: 'CLIENT' | 'ADMIN'
}

export interface AuthResponseDto {
  user: AuthUserDto
  accessToken: string
  refreshToken: string
}
