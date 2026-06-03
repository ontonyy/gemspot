import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import type { AuthUser } from '../auth/jwt-auth.guard'

/* Role gate. MUST run after JwtAuthGuard (which attaches req.user) —
   declare guards as `@UseGuards(JwtAuthGuard, AdminGuard)`. Rejects any
   authenticated non-ADMIN with 403. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>()
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required')
    }
    return true
  }
}
