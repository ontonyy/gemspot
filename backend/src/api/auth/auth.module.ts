import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from '../../application/auth/auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'

/* JwtModule registered globally so the guard (used across submissions/reports/
   saved modules) can inject JwtService without re-importing. Secrets/TTLs are
   read per-sign call from env in AuthService — JwtModule needs no static config. */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
